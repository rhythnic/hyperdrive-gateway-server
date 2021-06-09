/* eslint-env mocha */
import assert from 'assert'
import simple from 'simple-mock'
import { constants as http2Constants } from 'http2'
import { ObjectWritableMock } from 'stream-mock'
import { GatewayHyperspace } from '../../../services/gateway-hyperspace.js'
import { HyperdriveController } from '../../../infra/controllers/hyperdrive.js'
import { hexToBase32 } from '../../../lib/base32.js'
import { buildDrive, mockConsoleLog, HYPERSPACE_OPTIONS } from '../../helpers.js'
import { GatewayHyperdrive } from '../../../services/gateway-hyperdrive.js'

const {
  HTTP2_HEADER_PATH,
  HTTP2_HEADER_METHOD,
  HTTP2_HEADER_AUTHORITY,
  HTTP2_HEADER_SCHEME,
  HTTP_STATUS_NOT_FOUND,
  HTTP_STATUS_MOVED_PERMANENTLY
} = http2Constants

describe('HyperdriveController', () => {
  const key = '34f4c3f0bcf6bf5c39d7814d373946d8f04da5b4a525d940c98309cafb111d93'
  const keyBase32 = '6KTC7W5WYTZNREEQG56KEEA6V3R4V9DMMMJXJG69GC4WNYRH3P9G'
  let hyperspace
  let controller

  before(async () => {
    hyperspace = new GatewayHyperspace(HYPERSPACE_OPTIONS)
    await hyperspace.setup()
  })

  after(() => hyperspace.cleanup())

  beforeEach(() => {
    mockConsoleLog()
    controller = new HyperdriveController({ client: hyperspace.client })
  })

  describe('handleRequest', () => {
    describe('non-GET request', () => {
      it('returns false', async () => {
        const headers = { [HTTP2_HEADER_METHOD]: 'POST' }
        const stream = {}
        assert.strictEqual(await controller.handleRequest(stream, headers), false)
      })
    })

    describe('GET requests', () => {
      let headers
      let stream

      beforeEach(() => {
        headers = { [HTTP2_HEADER_METHOD]: 'GET' }
        stream = {}
      })

      describe('base32Key subdomain', () => {
        it('forwards the request to serverHyperdriveFile', () => {
          headers[HTTP2_HEADER_AUTHORITY] = `${keyBase32}.test.com`
          controller.serveHyperdriveFile = simple.stub()
          controller.handleRequest(stream, headers)
          const { args } = controller.serveHyperdriveFile.lastCall
          assert.deepStrictEqual(args, [stream, headers, keyBase32, 'test.com'])
        })
      })

      describe('no subdomain and /hyper/publicKey route', () => {
        let redirectRouteToSubdomain

        before(() => {
          redirectRouteToSubdomain = controller.constructor.redirectRouteToSubdomain
          controller.constructor.redirectRouteToSubdomain = simple.stub()
        })

        after(() => {
          controller.constructor.redirectRouteToSubdomain = redirectRouteToSubdomain
        })

        it('forwards the request to redirectRouteToSubdomain', () => {
          headers[HTTP2_HEADER_AUTHORITY] = 'test.com'
          headers[HTTP2_HEADER_PATH] = `/hyper/${key}/foo.svg`
          controller.handleRequest(stream, headers)
          const { args } = controller.constructor.redirectRouteToSubdomain.lastCall
          assert.deepStrictEqual(args, [stream, headers])
        })
      })

      describe('all other routes', () => {
        describe('1234.test.com/', () => {
          it('returns false', async () => {
            headers[HTTP2_HEADER_AUTHORITY] = '1234.test.com'
            assert.strictEqual(await controller.handleRequest(stream, headers), false)
          })
        })

        describe('test.com/foo/bar', () => {
          it('returns false', async () => {
            headers[HTTP2_HEADER_AUTHORITY] = 'test.com'
            headers[HTTP2_HEADER_PATH] = '/foo/bar'
            assert.strictEqual(await controller.handleRequest(stream, headers), false)
          })
        })
      })
    })
  })

  describe('redirectRouteToSubdomain', () => {
    let headers
    let stream

    beforeEach(() => {
      headers = {
        [HTTP2_HEADER_METHOD]: 'GET',
        [HTTP2_HEADER_SCHEME]: 'https',
        [HTTP2_HEADER_AUTHORITY]: 'test.com',
        [HTTP2_HEADER_PATH]: `/hyper/${key}/foo.svg`
      }
      stream = { end: simple.stub(), respond: simple.stub() }
    })

    it('responds with redirect status', () => {
      HyperdriveController.redirectRouteToSubdomain(stream, headers)
      const response = stream.respond.lastCall.args[0]
      assert.strictEqual(response[':status'], HTTP_STATUS_MOVED_PERMANENTLY)
    })

    it('responds with location at base32Key subdomain', () => {
      HyperdriveController.redirectRouteToSubdomain(stream, headers)
      const response = stream.respond.lastCall.args[0]
      assert.strictEqual(response.Location, `https://${keyBase32}.test.com/foo.svg`)
    })

    it('ends the stream', () => {
      HyperdriveController.redirectRouteToSubdomain(stream, headers)
      assert(stream.end.called)
    })
  })

  describe('serveHyperdriveFile', () => {
    let drive
    let driveBase32Key
    const svgContent = '<svg></svg>'
    let headers
    let stream

    before(async () => {
      drive = await buildDrive(hyperspace.client, '/foo.svg', svgContent)
      driveBase32Key = hexToBase32(drive.key.toString('hex'))
    })

    beforeEach(() => {
      headers = { [HTTP2_HEADER_SCHEME]: 'https' }
      stream = new ObjectWritableMock()
      stream.respond = simple.stub()
    })

    describe('file exists', () => {
      it('responds with file content in body of response', done => {
        headers[HTTP2_HEADER_PATH] = '/foo.svg'
        stream.on('finish', () => {
          assert.strictEqual(stream.data.toString('utf-8'), svgContent)
          done()
        })
        controller.serveHyperdriveFile(stream, headers, driveBase32Key, 'test.com').catch(done)
      })

      it('responds with the expected headers', async () => {
        headers[HTTP2_HEADER_PATH] = '/foo.svg'
        await controller.serveHyperdriveFile(stream, headers, driveBase32Key, 'test.com')
        const stat = await drive.promises.stat('/foo.svg')
        assert.deepStrictEqual(
          stream.respond.lastCall.args[0],
          HyperdriveController.fileResponseHeaders('/foo.svg', stat.size)
        )
      })
    })

    describe('file does not exist', () => {
      it('responds with a not-found error', async () => {
        headers[HTTP2_HEADER_PATH] = '/bar.jpg'
        await controller.serveHyperdriveFile(stream, headers, driveBase32Key, 'test.com')
        assert.strictEqual(stream.respond.lastCall.args[0][':status'], HTTP_STATUS_NOT_FOUND)
      })
    })
  })

  describe('cachedDrive', () => {
    it('returns an instance of GatewayHyperdrive', () => {
      const gatewayDrive = controller.cachedDrive(keyBase32)
      assert(gatewayDrive instanceof GatewayHyperdrive)
    })
  })
})
