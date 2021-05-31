/* eslint-env mocha */
import assert from 'assert'
import { Client as HyperspaceClient } from 'hyperspace'
import Hyperbee from 'hyperbee'
import { setupHyperspace } from '../../lib/hyperspace.js'
import { mockConsoleLog, HYPERSPACE_OPTIONS } from '../helpers.js'

describe('setupHyperspace', () => {
  beforeEach(() => {
    mockConsoleLog()
  })

  describe('client', () => {
    it('is an instance of HyperspaceClient', async () => {
      const { client, cleanup } = await setupHyperspace(HYPERSPACE_OPTIONS)
      assert(client instanceof HyperspaceClient)
      await cleanup()
    })
  })

  describe('write and read to storage', () => {
    let client
    let cleanup
    let db
    const dataKey = 'a'
    const dataValue = 'b'

    after(() => cleanup())

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
      ({ client, cleanup } = await setupHyperspace(HYPERSPACE_OPTIONS))
      db = await createHyperbee(client.corestore())
      await assert.doesNotReject(() => db.put(dataKey, dataValue))
    })

    it('can read from `storage`', async () => {
      const { value } = await db.get(dataKey)
      assert.strictEqual(value, dataValue)
    })
  })

  describe('cleanup', () => {
    it('closes the client', async () => {
      const { client, cleanup } = await setupHyperspace(HYPERSPACE_OPTIONS)
      await cleanup()
      assert.rejects(() => client.status())
    })
    describe('a server was created', () => {
      it('stops the server', async () => {
        const { cleanup: cleanup1 } = await setupHyperspace(HYPERSPACE_OPTIONS)
        const { client: client2, cleanup: cleanup2 } = await setupHyperspace(HYPERSPACE_OPTIONS)
        await cleanup1()
        assert.rejects(() => client2.status())
        await cleanup2()
      })
    })
  })
})
