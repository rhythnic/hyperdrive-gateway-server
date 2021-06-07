/* eslint-env mocha */
import assert from 'assert'
import { Client as HyperspaceClient } from 'hyperspace'
import Hyperbee from 'hyperbee'
import { GatewayHyperspace } from '../../services/gateway-hyperspace.js'
import { mockConsoleLog, HYPERSPACE_OPTIONS } from '../helpers.js'

describe('GatewayHyperspace', () => {
  beforeEach(() => {
    mockConsoleLog()
  })

  describe('setup', () => {
    it('creates an instance of HyperspaceClient', async () => {
      const hyperspace = new GatewayHyperspace(HYPERSPACE_OPTIONS)
      await hyperspace.setup()
      assert(hyperspace.client instanceof HyperspaceClient)
      await hyperspace.cleanup()
    })
  })

  describe('cleanup', () => {
    it('closes the client', async () => {
      const hyperspace = new GatewayHyperspace(HYPERSPACE_OPTIONS)
      await hyperspace.setup()
      await hyperspace.cleanup()
      assert.rejects(() => hyperspace.client.status())
    })
    describe('a server was created', () => {
      it('stops the server', async () => {
        const hyperspace1 = await new GatewayHyperspace(HYPERSPACE_OPTIONS)
        const hyperspace2 = await new GatewayHyperspace(HYPERSPACE_OPTIONS)
        await hyperspace1.setup()
        await hyperspace2.setup()
        await hyperspace1.cleanup()
        assert.rejects(() => hyperspace2.client.status())
        await hyperspace2.cleanup()
      })
    })
  })

  describe('write and read to storage', () => {
    let hyperspace
    let db
    const dataKey = 'a'
    const dataValue = 'b'

    after(() => hyperspace.cleanup())

    const createHyperbee = async store => {
      const core = store.get({ name: 'test-bee' })
      const db = new Hyperbee(core, {
        keyEncoding: 'utf-8',
        valueEncoding: 'utf-8'
      })
      await db.ready()
      return db
    }

    it('can write to `storage`', async () => {
      hyperspace = new GatewayHyperspace(HYPERSPACE_OPTIONS)
      await hyperspace.setup()
      db = await createHyperbee(hyperspace.client.corestore())
      await assert.doesNotReject(() => db.put(dataKey, dataValue))
    })

    it('can read from `storage`', async () => {
      const { value } = await db.get(dataKey)
      assert.strictEqual(value, dataValue)
    })
  })
})
