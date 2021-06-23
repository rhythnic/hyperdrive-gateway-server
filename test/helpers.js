import Hyperdrive from 'hyperdrive'
import simple from 'simple-mock'
import process from 'process'
import ramStorage from 'random-access-memory'
import hypercoreCrypto from 'hypercore-crypto'
import { GatewayHyperdrive } from '../services/gateway-hyperdrive.js'
import Corestore from 'corestore'

export function mockNetworkedCorestore (storage = ramStorage) {
  const corestore = new Corestore(storage)
  return {
    corestore,
    networker: {
      configure: simple.stub()
    }
  }
}

export function mockConsoleLog () {
  const log = simple.stub()
  global.console.log = log
}

export class MockDrives {
  constructor ({ corestore }) {
    this.corestore = corestore
  }

  static generateKey () {
    return hypercoreCrypto.keyPair().publicKey
  }

  static generateBase32Key () {
    return GatewayHyperdrive.hexToBase32(this.generateKey().toString('hex'))
  }

  async build (name, content) {
    const drive = new Hyperdrive(this.corestore, null)
    drive.on('error', err => {
      console.error(err)
      process.exit(1)
    })
    await drive.promises.ready()
    if (name) await drive.promises.writeFile(name, content)
    return drive
  }

  jsModule () {
    return this.build('/index.js', 'console.log(\'TEST\')')
  }

  async app ({ mountModule } = {}) {
    const jsModuleDrive = await this.jsModule()
    const appDrive = await this.build()
    let moduleLink
    if (mountModule) {
      await appDrive.promises.mount('/jsModule', jsModuleDrive.key)
      moduleLink = './jsModule/index.js'
    } else {
      moduleLink = `hyper://${jsModuleDrive.key.toString('hex')}/index.js`
    }
    await Promise.all([
      await appDrive.promises.writeFile('/index.html', `
        <body>
          <h1>Test</h1>
          <script type="module" src="${moduleLink}"></script>
        </body>`
      ),
      await appDrive.promises.writeFile('/logo.svg', '<svg></svg>')
    ])
    return { appDrive, jsModuleDrive }
  }
}
