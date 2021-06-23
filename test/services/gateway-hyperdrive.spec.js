/* eslint-env mocha */
import assert from 'assert'
import { GatewayHyperdrive, HYPER_URL_PATTERN } from '../../services/gateway-hyperdrive.js'
import rawBody from 'raw-body'
import { mockConsoleLog, mockNetworkedCorestore, MockDrives } from '../helpers.js'

describe('GatewayHyperdrive', () => {
  let key
  let corestoreMocks
  let appDrive
  let jsModuleDrive

  before(async () => {
    corestoreMocks = mockNetworkedCorestore()
    await corestoreMocks.corestore.ready()
    const mockDrives = new MockDrives(corestoreMocks)
    const webAppDrives = await mockDrives.app({ mountModule: true })
    appDrive = webAppDrives.appDrive
    jsModuleDrive = webAppDrives.jsModuleDrive
    key = appDrive.key.toString('hex')
  })

  beforeEach(() => {
    mockConsoleLog()
  })

  describe('hexToBase32', () => {
    it('converts a hex key to base32', () => {
      const base32Key = GatewayHyperdrive.hexToBase32(key)
      assert(GatewayHyperdrive.isValidBase32Key(base32Key))
    })
  })

  describe('isValidBase32Key', () => {
    it('returns true for a valid base32 key', () => {
      const base32Key = GatewayHyperdrive.hexToBase32(key)
      assert.strictEqual(GatewayHyperdrive.isValidBase32Key(base32Key), true)
    })

    it('returns false for an invalid base32 key', () => {
      const base32Key = GatewayHyperdrive.hexToBase32(key).slice(1)
      assert.strictEqual(GatewayHyperdrive.isValidBase32Key(base32Key), false)
    })
  })

  describe('resolveFile', () => {
    describe('file exists', () => {
      it('returns the stat object', async () => {
        const { stat } = await GatewayHyperdrive.resolveFile(jsModuleDrive, '/index.js')
        assert(stat.size)
      })
    })

    describe('file exists in mounted drive', () => {
      it('returns the stat object', async () => {
        const { stat } = await GatewayHyperdrive.resolveFile(appDrive, '/jsModule/index.js')
        assert(stat.size)
      })
    })

    describe('file path does not exist', () => {
      describe('path has no extension', () => {
        it('returns `index.html` as name', async () => {
          const { name } = await GatewayHyperdrive.resolveFile(appDrive, '/foo')
          assert.strictEqual(name, '/index.html')
        })

        it('returns the stat of /index.html', async () => {
          const [{ stat: stat1 }, { stat: stat2 }] = await Promise.all([
            GatewayHyperdrive.resolveFile(appDrive, '/foo'),
            GatewayHyperdrive.resolveFile(appDrive, '/index.html')
          ])
          assert.strictEqual(stat1.size, stat2.size)
        })
      })

      describe('path has extension', () => {
        it('throws an ENOENT error', async () => {
          return GatewayHyperdrive.resolveFile(appDrive, '/foo.js')
            .then(
              () => { throw new Error('Did not throw') },
              err => assert(err.code === 'ENOENT')
            )
        })
      })
    })
  })

  describe('createReadStream', () => {
    describe('file has web app file code extension (js, css, html)', () => {
      it('returns a stream for the hyperdrive file hyper links replaced with gateway links', async () => {
        const scheme = 'https'
        const host = 'test.com'
        const gatewayDriveData = await rawBody(GatewayHyperdrive.createReadStream(appDrive, '/jsModule/index.js', scheme, host), { encoding: 'utf-8' })
        const driveData = await rawBody(jsModuleDrive.promises.createReadStream('/index.js'), { encoding: 'utf-8' })
        const dataTransformed = driveData.replace(
          new RegExp(HYPER_URL_PATTERN, 'gi'),
          (_, preceedingChar, key) => `${preceedingChar}${scheme}://${GatewayHyperdrive.hexToBase32(key)}.${host}`
        )
        assert.strictEqual(gatewayDriveData, dataTransformed)
      })
    })

    describe('file does not have web app code extension', () => {
      it('returns a read stream for the hyperdrive file', async () => {
        const gatewayDriveData = await rawBody(GatewayHyperdrive.createReadStream(appDrive, '/logo.svg', 'https', 'test.com'), { encoding: 'utf-8' })
        const driveData = await rawBody(appDrive.promises.createReadStream('/logo.svg'), { encoding: 'utf-8' })
        assert.strictEqual(gatewayDriveData, driveData)
      })
    })
  })
})
