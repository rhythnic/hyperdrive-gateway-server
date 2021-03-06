/* eslint-env mocha */
import assert from 'assert'
import simple from 'simple-mock'
import { constants as http2Constants } from 'http2'
import { ObjectWritableMock } from 'stream-mock'
import { HyperdriveController } from '../../../infra/controllers/hyperdrive.js'
import { GatewayHyperdrive } from '../../../services/gateway-hyperdrive.js'
import { hexToBase32 } from '../../../lib/base32.js'
import { MockDrives, mockConsoleLog, mockNetworkedCorestore } from '../../helpers.js'
import { HyperdriveManager } from '../../../services/hyperdrive-manager.js'

const {
  HTTP2_HEADER_PATH,
  HTTP2_HEADER_METHOD,
  HTTP2_HEADER_AUTHORITY,
  HTTP2_HEADER_SCHEME,
  HTTP_STATUS_NOT_FOUND,
  HTTP_STATUS_MOVED_PERMANENTLY
} = http2Constants

describe('HyperdriveController', () => {
  let keyHex
  let keyBase32
  let corestoreMocks
  let controller

  before(async () => {
    corestoreMocks = mockNetworkedCorestore()
    await corestoreMocks.corestore.ready()
    const key = MockDrives.generateKey()
    keyHex = key.toString('hex')
    keyBase32 = GatewayHyperdrive.hexToBase32(keyHex)
  })

  beforeEach(() => {
    mockConsoleLog()
    const driveManager = new HyperdriveManager(corestoreMocks)
    controller = new HyperdriveController({ driveManager })
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
          headers[HTTP2_HEADER_PATH] = `/hyper/${keyHex}/foo.svg`
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
        [HTTP2_HEADER_PATH]: `/hyper/${keyHex}/foo.svg`
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
    let headers
    let stream

    before(async () => {
      const mockDrives = new MockDrives(corestoreMocks)
      drive = await mockDrives.jsModule()
      driveBase32Key = hexToBase32(drive.key.toString('hex'))
    })

    beforeEach(() => {
      headers = { [HTTP2_HEADER_SCHEME]: 'https' }
      stream = new ObjectWritableMock()
      stream.respond = simple.stub()
    })

    describe('file exists', () => {
      it('responds with file content in body of response', done => {
        headers[HTTP2_HEADER_PATH] = '/index.js'
        stream.on('finish', () => {
          drive.readFile('/index.js', { encoding: 'utf-8' }, (err, indexJsContent) => {
            if (err) return done(err)
            assert.strictEqual(stream.data.toString('utf-8'), indexJsContent)
            done()
          })
        })
        controller.serveHyperdriveFile(stream, headers, driveBase32Key, 'test.com').catch(done)
      })

      it('responds with the expected headers', async () => {
        headers[HTTP2_HEADER_PATH] = '/index.js'
        await controller.serveHyperdriveFile(stream, headers, driveBase32Key, 'test.com')
        const stat = await drive.promises.stat('/index.js')
        assert.deepStrictEqual(
          stream.respond.lastCall.args[0],
          HyperdriveController.fileResponseHeaders('/index.js', stat.size)
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
})
