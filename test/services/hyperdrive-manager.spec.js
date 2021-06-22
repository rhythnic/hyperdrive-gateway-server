/* eslint-env mocha */
import assert from 'assert'
import Hyperdrive from 'hyperdrive'
import simple from 'simple-mock'
import { mockConsoleLog, HYPERSPACE_OPTIONS, MockDrives } from '../helpers.js'
import { HyperdriveManager } from '../../services/hyperdrive-manager.js'
import { GatewayHyperspace } from '../../services/gateway-hyperspace.js'
import { GatewayHyperdrive } from '../../services/gateway-hyperdrive.js'

describe('HyperdriveManager', () => {
  let hyperspace
  let driveManager

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
      driveManager = new HyperdriveManager({ client: hyperspace.client })
      base32Key = MockDrives.generateBase32Key()
    })

    it('creates a new Hyperdrive', async () => {
      const drive = await driveManager.create(base32Key)
      assert(drive instanceof Hyperdrive, 'drive is not an instance of Hyperdrive')
    })

    it('caches hyperdrives', async () => {
      const drive1 = await driveManager.create(base32Key)
      const drive2 = await driveManager.create(base32Key)
      assert.strictEqual(drive1, drive2)
    })
  })

  describe('destroy', () => {
    let appDrive

    beforeEach(async () => {
      driveManager = new HyperdriveManager({ client: hyperspace.client, cacheSize: 1 })
      const mockDrives = new MockDrives({ client: hyperspace.client })
      const appDrives = await mockDrives.app()
      appDrive = appDrives.appDrive
    })

    it('is called when a drive is booted from cache', async () => {
      simple.mock(driveManager, 'destroy')
      const drive = await driveManager.create(GatewayHyperdrive.hexToBase32(appDrive.key.toString('hex')))
      await driveManager.create(MockDrives.generateBase32Key())
      assert.strictEqual(driveManager.destroy.lastCall.args[0], drive)
    })
  })
})
