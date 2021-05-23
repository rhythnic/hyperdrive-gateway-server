/* eslint-env mocha */
import assert from 'assert'
import process from 'process'
import storage from 'random-access-memory'
import simple from 'simple-mock'
import mime from 'mime-types'
import { extname } from 'path'
import { setupHyperspace } from '../../src/lib/hyperspace.js'
import { hyperdriveHttpGateway } from '../../src/lib/hyperdrive-http-gateway.js'
import { buildDrive, mockConsoleLog } from '../helpers.js'

describe('gateway-middleware', () => {
  const baseUrl = '/hyper'
  const req = (opts) => ({ ...opts, baseUrl })
  let middleware
  let cleanup
  let mainDriveKey
  let moduleDriveKey

  const jsModuleContent = 'console.log(\'TEST\')'

  const indexHtmlContent = moduleDriveKey => `
    <body>
      <h1>Test</h1>
      <script type="module" src="hyper://${moduleDriveKey}/index.js"></script>
    </body>`

  beforeEach(() => {
    mockConsoleLog()
  })

  before(async () => {
    const hyperspace = await setupHyperspace({
      storage,
      host: `hyperspace-${process.pid}`
    })
    cleanup = hyperspace.cleanup
    const corestore = hyperspace.client.corestore()
    middleware = hyperdriveHttpGateway({ corestore })
    moduleDriveKey = await buildDrive(corestore, '/index.js', jsModuleContent)
    mainDriveKey = await buildDrive(corestore, '/index.html', indexHtmlContent(moduleDriveKey))
  })

  after(() => cleanup())

  describe('hyperdrive incompatible urls', () => {
    it('calls next and exits early', async () => {
      const nonGatewayUrls = [
        '/foo',
        '/2304234203abcdef'
      ]
      const next = simple.stub()
      const res = {}
      await Promise.all(nonGatewayUrls.map(url => middleware(req({ url }), res, next)))
      assert.strictEqual(next.callCount, nonGatewayUrls.length)
    })
  })

  describe('hyperdrive compatible urls', () => {
    let res

    beforeEach(() => {
      res = {
        set: simple.stub(),
        send: simple.stub()
      }
    })

    it('serves the file contents with `hyper://` links pointed to the gateway', async () => {
      const url = `/${mainDriveKey}/index.html`
      await middleware(req({ url }), res)
      const linksReplacedContent = indexHtmlContent(moduleDriveKey).replace(
        /hyper:\/\/([^ ]+)/g,
        (_, publicKeyAndFilePath) => `${baseUrl}/${publicKeyAndFilePath}`
      )
      assert.strictEqual(res.send.lastCall.args[0], linksReplacedContent)
    })

    it('serves html with the appropriate content-type', async () => {
      const url = `/${mainDriveKey}/index.html`
      await middleware(req({ url }), res)
      assert.deepStrictEqual(res.set.lastCall.args, ['Content-Type', mime.contentType(extname(url))])
    })

    it('serves js with the appropriate content-type', async () => {
      const url = `/${moduleDriveKey}/index.js`
      await middleware(req({ url }), res)
      assert.deepStrictEqual(res.set.lastCall.args, ['Content-Type', mime.contentType(extname(url))])
    })
  })
})
