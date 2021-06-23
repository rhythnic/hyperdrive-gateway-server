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
  constructor ({ corestore, networker, cacheSize = 250 }) {
    this.corestore = corestore
    this.networker = networker
    this.cache = new QuickLRU({
      maxSize: cacheSize,
      onEviction: (_, drive) => {
        this.destroy(drive).catch(err => console.error(err))
      }
    })
  }

  async create (base32Key) {
    if (!this.cache.has(base32Key)) {
      const drive = new Hyperdrive(this.corestore, GatewayHyperdrive.base32ToBuffer(base32Key))
      await drive.promises.ready()
      await this.networker.configure(drive.discoveryKey, LOOKUP_CONFIG)
      this.cache.set(base32Key, drive)
    }
    return this.cache.get(base32Key)
  }

  async destroy (drive) {
    await this.networker.configure(drive.discoveryKey, FORGET_CONFIG)
    await drive.close()
  }
}
