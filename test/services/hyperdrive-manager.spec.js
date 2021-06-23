/* eslint-env mocha */
import assert from 'assert'
import Hyperdrive from 'hyperdrive'
import simple from 'simple-mock'
import { mockConsoleLog, mockNetworkedCorestore, MockDrives } from '../helpers.js'
import { HyperdriveManager } from '../../services/hyperdrive-manager.js'
import { GatewayHyperdrive } from '../../services/gateway-hyperdrive.js'

describe('HyperdriveManager', () => {
  let corestoreMocks
  let driveManager

  before(async () => {
    corestoreMocks = mockNetworkedCorestore()
    await corestoreMocks.corestore.ready()
    mockConsoleLog()
  })

  describe('create', () => {
    let base32Key

    before(() => {
      driveManager = new HyperdriveManager(corestoreMocks)
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
      driveManager = new HyperdriveManager({ ...corestoreMocks, cacheSize: 1 })
      const mockDrives = new MockDrives(corestoreMocks)
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
