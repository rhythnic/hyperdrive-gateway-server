/* eslint-env mocha */
import assert from 'assert'
import { constants as http2Constants } from 'http2'
import simple from 'simple-mock'
import mime from 'mime-types'
import { extname } from 'path'
import { tmpdir } from 'os'
import { ViewController } from '../../../infra/controllers/view.js'
import { mockConsoleLog } from '../../helpers.js'

const {
  HTTP2_HEADER_PATH,
  HTTP2_HEADER_METHOD,
  HTTP_STATUS_NOT_FOUND,
  HTTP_STATUS_INTERNAL_SERVER_ERROR
} = http2Constants

describe('ViewController', () => {
  let controller
  const staticDir = tmpdir()

  beforeEach(async () => {
    mockConsoleLog()
    controller = new ViewController({ staticDir })
    await controller.initialize()
  })

  describe('handleRequest', () => {
    describe('non-GET request', () => {
      it('returns false', async () => {
        const headers = { [HTTP2_HEADER_METHOD]: 'POST' }
        const stream = {}
        assert.strictEqual(await controller.handleRequest(stream, headers), false)
      })
    })

    describe('GET requestes', () => {
      it('forwards the request to serveStaticAsset', async () => {
        const headers = { [HTTP2_HEADER_METHOD]: 'GET' }
        const stream = {}
        controller.serveStaticAsset = simple.stub()
        await controller.handleRequest(stream, headers)
        assert.deepStrictEqual(controller.serveStaticAsset.lastCall.args, [stream, headers])
      })
    })
  })

  describe('serveStaticAsset', () => {
    let stream
    let headers

    beforeEach(() => {
      headers = []
      stream = {
        respond: simple.stub(),
        end: simple.stub(),
        respondWithFile: simple.stub()
      }
    })

    it('sets the content-type header on the response', async () => {
      headers[HTTP2_HEADER_PATH] = '/index.js'
      await controller.serveStaticAsset(stream, headers)
      const { args } = stream.respondWithFile.lastCall
      assert.strictEqual(args[1]['content-type'], mime.lookup(extname(headers[HTTP2_HEADER_PATH])))
    })

    describe('file does not have extension', () => {
      it('serves index.html', async () => {
        headers[HTTP2_HEADER_PATH] = '/foo'
        await controller.serveStaticAsset(stream, headers)
        const { args } = stream.respondWithFile.lastCall
        assert.strictEqual(args[0], `${staticDir}/index.html`)
      })
    })

    describe('file has extension', () => {
      describe('file exists', () => {
        it('serves file', async () => {
          headers[HTTP2_HEADER_PATH] = '/foo.svg'
          await controller.serveStaticAsset(stream, headers)
          const { args } = stream.respondWithFile.lastCall
          assert.strictEqual(args[0], `${staticDir}/foo.svg`)
        })
      })

      describe('file does not exist', () => {
        it('responds with not found error', async () => {
          headers[HTTP2_HEADER_PATH] = '/foo.svg'
          await controller.serveStaticAsset(stream, headers)
          const { onError } = stream.respondWithFile.lastCall.args[2]
          const error = new Error('NOT FOUND')
          error.code = 'ENOENT'
          onError(error)
          assert(stream.respond.lastCall.args[0][':status'], HTTP_STATUS_NOT_FOUND)
        })
      })

      describe('system error occurs while loading file', () => {
        it('responds with internal server error', async () => {
          headers[HTTP2_HEADER_PATH] = '/foo.svg'
          await controller.serveStaticAsset(stream, headers)
          const { onError } = stream.respondWithFile.lastCall.args[2]
          onError(new Error('SYSTEM'))
          assert(stream.respond.lastCall.args[0][':status'], HTTP_STATUS_INTERNAL_SERVER_ERROR)
        })
      })
    })
  })
})
