/* eslint-env mocha */
import assert from 'assert'
import { GatewayHyperdrive, HYPER_URL_PATTERN } from '../../services/gateway-hyperdrive.js'
import { GatewayHyperspace } from '../../services/gateway-hyperspace.js'
import rawBody from 'raw-body'
import { buildDrive, mockConsoleLog, HYPERSPACE_OPTIONS } from '../helpers.js'

describe('GatewayHyperdrive', () => {
  const key = '34f4c3f0bcf6bf5c39d7814d373946d8f04da5b4a525d940c98309cafb111d93'
  let hyperspace
  let mainDrive
  let moduleDrive

  const jsContent = 'console.log(\'TEST\')'
  const svgContent = '<svg></svg>'

  const indexHtmlContent = moduleDriveKey => `
    <body>
      <h1>Test</h1>
      <script type="module" src="hyper://${moduleDriveKey}/index.js"></script>
    </body>`

  before(async () => {
    hyperspace = new GatewayHyperspace(HYPERSPACE_OPTIONS)
    await hyperspace.setup()
    moduleDrive = await buildDrive(hyperspace.client, '/index.js', jsContent)
    const moduleDriveKey = moduleDrive.key.toString('hex')
    mainDrive = await buildDrive(hyperspace.client, '/index.html', indexHtmlContent(moduleDriveKey))
    await mainDrive.promises.writeFile('/logo.svg', svgContent)
  })

  after(() => hyperspace.cleanup())

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
    describe('file path exists', () => {
      it('returns the stat object', async () => {
        const { stat } = await GatewayHyperdrive.resolveFile(moduleDrive, '/index.js')
        assert(stat.size)
      })
    })

    describe('file path does not exist', () => {
      describe('path has no extension', () => {
        it('returns `index.html` as name', async () => {
          const { name } = await GatewayHyperdrive.resolveFile(mainDrive, '/foo')
          assert.strictEqual(name, '/index.html')
        })

        it('returns the stat of /index.html', async () => {
          const [{ stat: stat1 }, { stat: stat2 }] = await Promise.all([
            GatewayHyperdrive.resolveFile(mainDrive, '/foo'),
            GatewayHyperdrive.resolveFile(mainDrive, '/index.html')
          ])
          assert.strictEqual(stat1.size, stat2.size)
        })
      })

      describe('path has extension', () => {
        it('throws an ENOENT error', async () => {
          return GatewayHyperdrive.resolveFile(mainDrive, '/foo.js')
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
        const gatewayDriveData = await rawBody(GatewayHyperdrive.createReadStream(moduleDrive, '/index.js', scheme, host), { encoding: 'utf-8' })
        const driveData = await rawBody(moduleDrive.promises.createReadStream('/index.js'), { encoding: 'utf-8' })
        const dataTransformed = driveData.replace(
          new RegExp(HYPER_URL_PATTERN, 'gi'),
          (_, preceedingChar, key) => `${preceedingChar}${scheme}://${GatewayHyperdrive.hexToBase32(key)}.${host}`
        )
        assert.strictEqual(gatewayDriveData, dataTransformed)
      })
    })

    describe('file does not have web app code extension', () => {
      it('returns a read stream for the hyperdrive file', async () => {
        const gatewayDriveData = await rawBody(GatewayHyperdrive.createReadStream(mainDrive, '/logo.svg', 'https', 'test.com'), { encoding: 'utf-8' })
        const driveData = await rawBody(mainDrive.promises.createReadStream('/logo.svg'), { encoding: 'utf-8' })
        assert.strictEqual(gatewayDriveData, driveData)
      })
    })
  })
})
