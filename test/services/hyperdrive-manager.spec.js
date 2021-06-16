/* eslint-env mocha */
import assert from 'assert'
import Hyperdrive from 'hyperdrive'
import simple from 'simple-mock'
import { HyperdriveManager } from '../../services/hyperdrive-manager.js'
import { GatewayHyperspace } from '../../services/gateway-hyperspace.js'
import { mockConsoleLog, HYPERSPACE_OPTIONS, MockDrives } from '../helpers.js'

describe('HyperdriveManager', () => {
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
    let base32Key

    before(() => {
      manager = new HyperdriveManager({ client: hyperspace.client })
      base32Key = MockDrives.generateBase32Key()
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
    beforeEach(async () => {
      manager = new HyperdriveManager({ client: hyperspace.client, cacheSize: 1 })
    })

    it('is called when a drive is booted from cache', async () => {
      simple.mock(manager, 'destroy')
      const drive1 = await manager.create(MockDrives.generateBase32Key())
      await manager.create(MockDrives.generateBase32Key())
      assert.strictEqual(manager.destroy.lastCall.args[0], drive1)
    })
  })
})
