import Hyperdrive from 'hyperdrive'
import simple from 'simple-mock'
import process from 'process'
import storage from 'random-access-memory'
import crypto from 'hypercore-crypto'
import { GatewayHyperdrive } from '../services/gateway-hyperdrive.js'

export const HYPERSPACE_OPTIONS = {
  storage,
  host: `hyperspace-${process.pid}`,
  noAnnounce: true,
  network: {
    ephemeral: true
  }
}

export function mockConsoleLog () {
  const log = simple.stub()
  global.console.log = log
}

export class MockDrives {
  constructor ({ client }) {
    this.client = client
  }

  static generateKey () {
    return crypto.keyPair().publicKey
  }

  static generateBase32Key () {
    return GatewayHyperdrive.hexToBase32(this.generateKey().toString('hex'))
  }

  async build (name, content) {
    const drive = new Hyperdrive(this.client.corestore())
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
