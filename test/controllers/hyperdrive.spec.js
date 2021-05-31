/* eslint-env mocha */
import assert from 'assert'
import simple from 'simple-mock'
import mime from 'mime-types'
import { extname } from 'path'
import { setupHyperspace } from '../../lib/hyperspace.js'
import { HyperdriveController } from '../../controllers/hyperdrive.js'
import { buildDrive, mockConsoleLog, HYPERSPACE_OPTIONS } from '../helpers.js'

describe('HyperdriveController', () => {
  let hyperspace
  let controller
  let mainDriveKey
  let moduleDriveKey

  const jsModuleContent = 'console.log(\'TEST\')'

  const indexHtmlContent = moduleDriveKey => `
    <body>
      <h1>Test</h1>
      <script type="module" src="hyper://${moduleDriveKey}/index.js"></script>
    </body>`

  before(async () => {
    hyperspace = await setupHyperspace(HYPERSPACE_OPTIONS)
    moduleDriveKey = await buildDrive(hyperspace.client, '/index.js', jsModuleContent)
    mainDriveKey = await buildDrive(hyperspace.client, '/index.html', indexHtmlContent(moduleDriveKey))
  })

  after(() => hyperspace.cleanup())

  beforeEach(() => {
    mockConsoleLog()
    controller = new HyperdriveController(hyperspace.client)
  })

  describe('handleRequest', () => {
    describe('non-GET request', () => {
      it('returns false', async () => {
        const headers = { ':method': 'POST' }
        const stream = {}
        assert.strictEqual(await controller.handleRequest(stream, headers), false)
      })
    })

    describe('GET requests', () => {
      describe('hyperdrive incompatible urls', () => {
        it('returns false', async () => {
          const nonGatewayPaths = [
            '/foo',
            '/2304234203abcdef'
          ]
          const stream = {}
          await Promise.all(nonGatewayPaths.map(async path => {
            const headers = { ':method': 'POST', ':path': path }
            const result = await controller.handleRequest(stream, headers)
            assert.strictEqual(result, false)
          }))
        })
      })

      describe('hyperdrive compatible urls', () => {
        let stream
        let headers

        beforeEach(() => {
          headers = { ':method': 'GET' }
          stream = { end: simple.stub(), respond: simple.stub() }
        })

        it('sets statusCode to 200', async () => {
          headers[':path'] = `/hyper/${mainDriveKey}/index.html`
          await controller.handleRequest(stream, headers)
          const response = stream.respond.lastCall.args[0]
          assert.strictEqual(response[':status'], 200)
        })

        it('serves the file contents with `hyper://` links pointed to the gateway', async () => {
          headers[':path'] = `/hyper/${mainDriveKey}/index.html`
          await controller.handleRequest(stream, headers)
          const linksReplacedContent = HyperdriveController.replaceDependencyLinks('/hyper', indexHtmlContent(moduleDriveKey))
          assert.strictEqual(stream.end.lastCall.args[0], linksReplacedContent)
        })

        it('serves html with the appropriate content-type', async () => {
          headers[':path'] = `/hyper/${mainDriveKey}/index.html`
          await controller.handleRequest(stream, headers)
          const response = stream.respond.lastCall.args[0]
          assert.deepStrictEqual(response['content-type'], mime.contentType(extname(headers[':path'])))
        })

        it('serves js with the appropriate content-type', async () => {
          headers[':path'] = `/hyper/${moduleDriveKey}/index.js`
          await controller.handleRequest(stream, headers)
          const response = stream.respond.lastCall.args[0]
          assert.deepStrictEqual(response['content-type'], mime.contentType(extname(headers[':path'])))
        })
      })
    })
  })
})
