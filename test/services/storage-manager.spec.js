/* eslint-env mocha */
import assert from 'assert'
import { tmpdir } from 'os'
import fs from 'fs'
import { join as joinPath } from 'path'
import { MockDrives, HYPERSPACE_OPTIONS } from '../helpers.js'
import { StorageManager } from '../../services/storage-manager.js'
import { GatewayHyperspace } from '../../services/gateway-hyperspace.js'

describe('StorageManager', () => {
  let hyperspace
  let mockDrives
  const storage = joinPath(tmpdir(), 'storage-manager-test')

  before(async () => {
    if (!fs.existsSync(storage)) fs.mkdirSync(storage)
    hyperspace = new GatewayHyperspace({ ...HYPERSPACE_OPTIONS, storage })
    await hyperspace.setup()
    mockDrives = new MockDrives({ client: hyperspace.client })
  })

  after(async () => {
    await fs.promises.rm(storage, { recursive: true, force: true })
    await hyperspace.cleanup()
  })

  describe('coreIndex', () => {
    let driveMap

    before(async () => {
      const { appDrive, jsModuleDrive } = await mockDrives.app()
      const journalDrive = await mockDrives.build('/journals/today.md', 'It was the best of times...')
      driveMap = new Map()
      driveMap.set(appDrive.key.toString('hex'), appDrive)
      driveMap.set(jsModuleDrive.key.toString('hex'), jsModuleDrive)
      driveMap.set(journalDrive.key.toString('hex'), journalDrive)
    })
    it('creates an index of all hypercores in storage', async () => {
      const coreIndex = await StorageManager.coreIndex(storage)
      driveMap.forEach((drive, hexKey) => {
        assert.strictEqual(coreIndex[drive.discoveryKey.toString('hex')], 0)
      })
    })
  })
})
