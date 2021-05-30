/* eslint-env mocha */
import assert from 'assert'
import simple from 'simple-mock'
import mime from 'mime-types'
import { URL } from 'url'
import { extname } from 'path'
import { setupHyperspace } from '../../lib/hyperspace.js'
import { HyperdriveController } from '../../controllers/hyperdrive.js'
import { buildDrive, mockConsoleLog, HYPERSPACE_OPTIONS } from '../helpers.js'

describe('HyperdriveController', () => {
  let hyperspace
  let controller
  let mainDriveKey
  let moduleDriveKey

  const origin = 'http://test.com'
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
        const req = { method: 'POST' }
        assert.strictEqual(await controller.handleRequest(req), false)
      })
    })

    describe('GET requests', () => {
      describe('hyperdrive incompatible urls', () => {
        it('returns false', async () => {
          const nonGatewayPaths = [
            '/foo',
            '/2304234203abcdef'
          ]
          await Promise.all(nonGatewayPaths.map(async pathname => {
            const req = { method: 'GET' }
            const res = {}
            const url = new URL(pathname, origin)
            const result = await controller.handleRequest(req, res, url)
            assert.strictEqual(result, false)
          }))
        })
      })

      describe('hyperdrive compatible urls', () => {
        let req
        let res

        beforeEach(() => {
          req = { method: 'GET' }
          res = { end: simple.stub(), setHeader: simple.stub() }
        })

        it('sets statusCode to 200', async () => {
          const url = new URL(`/hyper/${mainDriveKey}/index.html`, origin)
          await controller.handleRequest(req, res, url)
          assert.strictEqual(res.statusCode, 200)
        })

        it('serves the file contents with `hyper://` links pointed to the gateway', async () => {
          const url = new URL(`/hyper/${mainDriveKey}/index.html`, origin)
          await controller.handleRequest(req, res, url)
          const linksReplacedContent = indexHtmlContent(moduleDriveKey).replace(
            /hyper:\/\/([^ ]+)/g,
            (_, publicKeyAndFilePath) => `/hyper/${publicKeyAndFilePath}`
          )
          assert.strictEqual(res.end.lastCall.args[0], linksReplacedContent)
        })

        it('serves html with the appropriate content-type', async () => {
          const url = new URL(`/hyper/${mainDriveKey}/index.html`, origin)
          await controller.handleRequest(req, res, url)
          assert.deepStrictEqual(res.setHeader.lastCall.args, ['Content-Type', mime.contentType(extname(url.pathname))])
        })

        it('serves js with the appropriate content-type', async () => {
          const url = new URL(`/hyper/${moduleDriveKey}/index.js`, origin)
          await controller.handleRequest(req, res, url)
          assert.deepStrictEqual(res.setHeader.lastCall.args, ['Content-Type', mime.contentType(extname(url.pathname))])
        })
      })
    })
  })
})
