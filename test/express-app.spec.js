/* eslint-env mocha */
import assert from 'assert'
import process from 'process'
import storage from 'random-access-memory'
import request from 'supertest'
import { setupHyperspace } from '../lib/hyperspace.js'
import { setupExpress } from '../lib/express-app.js'
import { buildDrive, mockConsoleLog } from './helpers.js'

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
      const hyperspace = await setupHyperspace({
        storage,
        host: `hyperspace-${process.pid}`,
        noAnnounce: true,
        network: {
          ephemeral: true
        }
      })
      cleanup = hyperspace.cleanup
      app = setupExpress({ hyperspaceClient: hyperspace.client })
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
