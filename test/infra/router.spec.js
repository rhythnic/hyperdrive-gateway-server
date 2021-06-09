/* eslint-env mocha */
import assert from 'assert'
import simple from 'simple-mock'
import { Router } from '../../infra/router.js'
import { mockConsoleLog } from '../helpers.js'

describe('Router', () => {
  describe('handleRequest', () => {
    let controllers
    let stream
    let headers
    let router

    beforeEach(() => {
      mockConsoleLog()
      controllers = [
        { handleRequest: simple.stub() },
        { handleRequest: simple.stub() }
      ]
      stream = { respond: simple.stub(), end: simple.stub() }
      headers = {}
      router = new Router(controllers)
    })

    describe('initialize', () => {
      it('initializes each controller with an initialize method', async () => {
        controllers[0].initialize = simple.stub()
        await router.initialize()
        assert(controllers[0].initialize.called)
      })
    })

    describe('request delegation', () => {
      it('attempts to delegate the request to each controller', async () => {
        controllers.forEach(x => x.handleRequest.resolveWith(false))
        await router.handleRequest(stream, headers)
        assert(controllers.every(x => x.handleRequest.called))
      })
      it('stops delegation once a controller#handleRequest returns true', async () => {
        controllers[0].handleRequest.resolveWith(true)
        await router.handleRequest(stream, headers)
        assert.strictEqual(controllers[1].handleRequest.called, false)
      })
      it('returns a 404 if no controller handles the request', async () => {
        controllers.forEach(x => x.handleRequest.resolveWith(false))
        await router.handleRequest(stream, headers)
        const response = stream.respond.lastCall.args[0]
        assert.strictEqual(response[':status'], 404)
      })
    })

    describe('error handling', () => {
      it('returns a 500 if a controller throws an error', async () => {
        controllers[0].handleRequest.rejectWith(new Error('TEST'))
        await router.handleRequest(stream, headers)
        const response = stream.respond.lastCall.args[0]
        assert.strictEqual(response[':status'], 500)
      })
    })
  })
})
