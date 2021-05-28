/* eslint-env mocha */
import assert from 'assert'
import process from 'process'
import { Client as HyperspaceClient } from 'hyperspace'
import Hyperbee from 'hyperbee'
import storage from 'random-access-memory'
import { setupHyperspace } from '../../lib/hyperspace.js'
import { mockConsoleLog } from '../helpers.js'

describe('setupHyperspace', () => {
  const host = `hyperspace-${process.pid}`

  beforeEach(() => {
    mockConsoleLog()
  })

  describe('client', () => {
    it('is an instance of HyperspaceClient', async () => {
      const { client, cleanup } = await setupHyperspace({
        storage,
        host,
        noAnnounce: true,
        network: {
          ephemeral: true
        }
      })
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
      ({ client, cleanup } = await setupHyperspace({ storage, host }))
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
      const { client, cleanup } = await setupHyperspace({ storage, host })
      await cleanup()
      assert.rejects(() => client.status())
    })
    describe('a server was created', () => {
      it('stops the server', async () => {
        const { cleanup: cleanup1 } = await setupHyperspace({ storage, host })
        const { client: client2, cleanup: cleanup2 } = await setupHyperspace({ storage, host })
        await cleanup1()
        assert.rejects(() => client2.status())
        await cleanup2()
      })
    })
  })
})
