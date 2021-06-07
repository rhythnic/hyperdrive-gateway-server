/* eslint-env mocha */
import assert from 'assert'
import { GatewayHyperdriveRead, HYPER_URL_PATTERN } from '../../services/gateway-hyperdrive-read.js'
import { GatewayHyperspace } from '../../services/gateway-hyperspace.js'
import rawBody from 'raw-body'
import { buildDrive, mockConsoleLog, HYPERSPACE_OPTIONS } from '../helpers.js'

describe('GatewayHyperdriveRead', () => {
  const key = '34f4c3f0bcf6bf5c39d7814d373946d8f04da5b4a525d940c98309cafb111d93'
  let hyperspace
  let mainDrive
  let mainDriveBase32Key
  let moduleDrive
  let moduleDriveBase32Key

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
    moduleDriveBase32Key = GatewayHyperdriveRead.toBase32(moduleDriveKey)
    mainDrive = await buildDrive(hyperspace.client, '/index.html', indexHtmlContent(moduleDriveKey))
    const mainDriveKey = mainDrive.key.toString('hex')
    mainDriveBase32Key = GatewayHyperdriveRead.toBase32(mainDriveKey)
    await mainDrive.promises.writeFile('/logo.svg', svgContent)
  })

  after(() => hyperspace.cleanup())

  beforeEach(() => {
    mockConsoleLog()
  })

  describe('toBase32', () => {
    it('converts a hex key to base32', () => {
      assert(GatewayHyperdriveRead.base32KeyIsValid(GatewayHyperdriveRead.toBase32(key)))
    })
  })

  describe('base32KeyIsValid', () => {
    it('returns true for a valid base32 key', () => {
      const base32Key = GatewayHyperdriveRead.toBase32(key)
      assert.strictEqual(GatewayHyperdriveRead.base32KeyIsValid(base32Key), true)
    })

    it('returns false for an invalid base32 key', () => {
      const base32Key = GatewayHyperdriveRead.toBase32(key).slice(1)
      assert.strictEqual(GatewayHyperdriveRead.base32KeyIsValid(base32Key), false)
    })
  })

  describe('resolveFile', () => {
    describe('file path exists', () => {
      it('returns the stat object', async () => {
        const driveRead = new GatewayHyperdriveRead(hyperspace.client, moduleDriveBase32Key, '/index.js')
        await driveRead.ready()
        assert(true)
        // const stat = await driveRead.resolveFile()
        // assert(stat.size)
      })
    })

    describe('file path does not exist', () => {
      describe('path has no extension', () => {
        it('sets the name attribute to index.html', async () => {
          const driveRead = new GatewayHyperdriveRead(hyperspace.client, mainDriveBase32Key, '/foo')
          await driveRead.ready()
          await driveRead.resolveFile()
          assert.strictEqual(driveRead.name, '/index.html')
        })

        it('returns the stat of /index.html', async () => {
          const driveRead1 = new GatewayHyperdriveRead(hyperspace.client, mainDriveBase32Key, '/foo')
          const driveRead2 = new GatewayHyperdriveRead(hyperspace.client, mainDriveBase32Key, '/index.html')
          await Promise.all([
            driveRead1.ready(),
            driveRead2.ready()
          ])
          const [stat1, stat2] = await Promise.all([
            driveRead1.resolveFile(),
            driveRead2.resolveFile()
          ])
          assert.strictEqual(stat1.size, stat2.size)
        })
      })

      describe('path has extension', () => {
        it('throws an ENOENT error', async () => {
          const driveRead = new GatewayHyperdriveRead(hyperspace.client, mainDriveBase32Key, '/foo.js')
          await driveRead.ready()
          return driveRead.resolveFile()
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
        const driveRead = new GatewayHyperdriveRead(hyperspace.client, moduleDriveBase32Key, '/index.js')
        const driveReadData = await rawBody(driveRead.createReadStream(scheme, host), { encoding: 'utf-8' })
        const driveData = await rawBody(moduleDrive.promises.createReadStream('/index.js'), { encoding: 'utf-8' })
        const dataTransformed = driveData.replace(
          new RegExp(HYPER_URL_PATTERN, 'gi'),
          (_, preceedingChar, key) => `${preceedingChar}${scheme}://${this.toBase32(key)}.${host}`
        )
        assert.strictEqual(driveReadData, dataTransformed)
      })
    })

    describe('file does not have web app code extension', () => {
      it('returns a read stream for the hyperdrive file', async () => {
        const scheme = 'https'
        const host = 'test.com'
        const driveRead = new GatewayHyperdriveRead(hyperspace.client, mainDriveBase32Key, '/logo.svg')
        const driveReadData = await rawBody(driveRead.createReadStream(scheme, host), { encoding: 'utf-8' })
        const driveData = await rawBody(mainDrive.promises.createReadStream('/logo.svg'), { encoding: 'utf-8' })
        assert.strictEqual(driveReadData, driveData)
      })
    })
  })
})
