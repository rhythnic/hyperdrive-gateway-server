/* eslint-env mocha */
import assert from 'assert'
import simple from 'simple-mock'
import { streamHandler } from '../../lib/stream-handler.js'
import { mockConsoleLog } from '../helpers.js'

describe('stream-handler', () => {
  let controllers
  let stream
  let headers
  let handleStream

  beforeEach(() => {
    mockConsoleLog()
    controllers = [
      { handleRequest: simple.stub() },
      { handleRequest: simple.stub() }
    ]
    stream = { respond: simple.stub(), end: simple.stub() }
    headers = {}
    handleStream = streamHandler(controllers)
  })

  describe('request delegation', () => {
    it('attempts to delegate the request to each controller', async () => {
      controllers.forEach(x => x.handleRequest.resolveWith(false))
      await handleStream(stream, headers)
      assert(controllers.every(x => x.handleRequest.called))
    })
    it('stops delegation once a controller#handleRequest returns true', async () => {
      controllers[0].handleRequest.resolveWith(true)
      await handleStream(stream, headers)
      assert.strictEqual(controllers[1].handleRequest.called, false)
    })
    it('returns a 404 if no controller handles the request', async () => {
      controllers.forEach(x => x.handleRequest.resolveWith(false))
      await handleStream(stream, headers)
      const response = stream.respond.lastCall.args[0]
      assert.strictEqual(response[':status'], 404)
    })
  })

  describe('error handling', () => {
    it('returns a 500 if a controller throws an error', async () => {
      controllers[0].handleRequest.rejectWith(new Error('TEST'))
      await handleStream(stream, headers)
      const response = stream.respond.lastCall.args[0]
      assert.strictEqual(response[':status'], 500)
    })
  })
})
