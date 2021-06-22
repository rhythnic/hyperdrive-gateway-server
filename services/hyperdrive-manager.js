import Hyperdrive from 'hyperdrive'
import { GatewayHyperdrive } from './gateway-hyperdrive.js'
import QuickLRU from 'quick-lru'

const LOOKUP_CONFIG = {
  announce: false,
  lookup: true
}

const FORGET_CONFIG = {
  announce: false,
  lookup: false
}

export class HyperdriveManager {
  constructor ({ client, cacheSize = 250 }) {
    this.client = client
    this.cache = new QuickLRU({
      maxSize: cacheSize,
      onEviction: (_, drive) => {
        this.destroy(drive).catch(err => console.error(err))
      }
    })
  }

  async create (base32Key) {
    if (!this.cache.has(base32Key)) {
      const drive = new Hyperdrive(this.client.corestore(), GatewayHyperdrive.base32ToBuffer(base32Key))
      await drive.promises.ready()
      await this.client.network.configure(drive.discoveryKey, LOOKUP_CONFIG)
      this.cache.set(base32Key, drive)
    }
    return this.cache.get(base32Key)
  }

  async destroy (drive) {
    await this.client.network.configure(drive.discoveryKey, FORGET_CONFIG)
    await drive.close()
  }
}
