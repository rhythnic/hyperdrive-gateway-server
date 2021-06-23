/* eslint-env mocha */
import assert from 'assert'
import { tmpdir } from 'os'
import fs from 'fs'
import { join as joinPath } from 'path'
import { MockDrives, mockNetworkedCorestore } from '../helpers.js'
import { StorageManager } from '../../services/storage-manager.js'

describe('StorageManager', () => {
  let corestoreMocks
  let mockDrives
  const storage = joinPath(tmpdir(), 'storage-manager-test')

  before(async () => {
    if (!fs.existsSync(storage)) fs.mkdirSync(storage)
    corestoreMocks = mockNetworkedCorestore(storage)
    await corestoreMocks.corestore.ready()
    mockDrives = new MockDrives(corestoreMocks)
  })

  after(async () => {
    await fs.promises.rm(storage, { recursive: true, force: true })
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
