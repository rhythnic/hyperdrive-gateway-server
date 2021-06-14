/* eslint-env mocha */
import assert from 'assert'
import Hyperdrive from 'hyperdrive'
import simple from 'simple-mock'
import { HyperdriveManager } from '../../services/hyperdrive-manager.js'
import { GatewayHyperspace } from '../../services/gateway-hyperspace.js'
import { GatewayHyperdrive } from '../../services/gateway-hyperdrive.js'
import { mockConsoleLog, HYPERSPACE_OPTIONS } from '../helpers.js'

describe('HyperdriveManager', () => {
  const key = '34f4c3f0bcf6bf5c39d7814d373946d8f04da5b4a525d940c98309cafb111d93'
  const key2 = '34f4c3f0bcf6bf5c39d7814d373946d8f04da5b4a525d940c98309cafb111d94'
  const base32Key = GatewayHyperdrive.hexToBase32(key)
  const base32Key2 = GatewayHyperdrive.hexToBase32(key2)
  let hyperspace
  let manager

  before(async () => {
    hyperspace = new GatewayHyperspace(HYPERSPACE_OPTIONS)
    await hyperspace.setup()
  })

  after(() => hyperspace.cleanup())

  beforeEach(() => {
    mockConsoleLog()
  })

  describe('create', () => {
    before(() => {
      manager = new HyperdriveManager({ client: hyperspace.client })
    })

    it('creates a new Hyperdrive', async () => {
      const drive = await manager.create(base32Key)
      assert(drive instanceof Hyperdrive, 'drive is not an instance of Hyperdrive')
    })
    it('caches hyperdrives', async () => {
      const drive1 = await manager.create(base32Key)
      const drive2 = await manager.create(base32Key)
      assert.strictEqual(drive1, drive2)
    })
  })

  describe('destroy', () => {
    beforeEach(() => {
      manager = new HyperdriveManager({ client: hyperspace.client, cacheSize: 1 })
    })

    it('is called when a drive is booted from cache', async () => {
      simple.mock(manager, 'destroy')
      const drive1 = await manager.create(base32Key)
      await manager.create(base32Key2)
      assert.strictEqual(manager.destroy.lastCall.args[0], drive1)
    })
  })
})
