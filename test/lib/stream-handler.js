/* eslint-env mocha */
import assert from 'assert'
import request from 'supertest'
import { setupHyperspace } from '../../lib/hyperspace.js'
import { streamHandler } from '../../lib/stream-handler.js'
import { buildDrive, mockConsoleLog, HYPERSPACE_OPTIONS } from '../helpers.js'
import { HyperdriveController } from '../../controllers/hyperdrive.js'

describe('express-app', () => {
  beforeEach(() => {
    mockConsoleLog()
  })

  describe('/hyper', () => {
    let cleanup
    let app
    let driveKey

    const indexHtmlContent = 'body><h1>Test</h1></body>'

    before(async () => {
      const hyperspace = await setupHyperspace(HYPERSPACE_OPTIONS)
      cleanup = hyperspace.cleanup
      const controllers = [
        new HyperdriveController(hyperspace.client)
      ]
      app = streamHandler(controllers)
      driveKey = await buildDrive(hyperspace.client, '/index.html', indexHtmlContent)
    })

    after(() => cleanup())

    it('fetches a hyperdrive file', () => {
      return request(app)
        .get(`/hyper/${driveKey}/index.html`)
        .set('Accept', 'text/html')
        .expect('Content-Type', /text\/html/)
        .expect(200)
        .then(({ text }) => {
          assert.strictEqual(text, indexHtmlContent)
        })
    })
  })
})
