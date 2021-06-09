import Hyperdrive from 'hyperdrive'
import { extname } from 'path'
import replaceStream from 'replacestream'
import { hexToBase32, base32ToBuffer, BASE32_PATTERN } from '../lib/base32.js'

export const PUBLIC_KEY_PATTERN = '([0-9a-f]{64})' // using \d does not work
export const HYPER_URL_PATTERN = `([^>])hyper://${PUBLIC_KEY_PATTERN}`
const HYPER_URL_REGEX = new RegExp(HYPER_URL_PATTERN, 'gi')
const BASE32_KEY_REGEX = new RegExp(`^${BASE32_PATTERN}{52}$`, 'i')

const WEB_APP_CODE_EXTENSIONS = ['.html', '.js', '.css']

const HYPER_URL_TRANSFORMER_CONFIG = {
  maxMatchLen: 73 // HYPER_URL_REGEX match length
}

const LOOKUP_CONFIG = {
  announce: false,
  lookup: true
}

const FORGET_CONFIG = {
  announce: false,
  lookup: false
}

export class GatewayHyperdrive {
  static toBase32 (key) {
    return hexToBase32(key)
  }

  static base32KeyIsValid (key) {
    return BASE32_KEY_REGEX.test(key)
  }

  static hyperUrlTransformer (scheme, host) {
    return replaceStream(
      HYPER_URL_REGEX,
      (_, preceedingChar, key) => `${preceedingChar}${scheme}://${this.toBase32(key)}.${host}`,
      HYPER_URL_TRANSFORMER_CONFIG
    )
  }

  constructor (client, base32Key) {
    this.client = client
    this.drive = new Hyperdrive(client.corestore(), base32ToBuffer(base32Key))
    this.lastReadTime = 0
  }

  async ready () {
    await this.drive.promises.ready()
    await this.client.network.configure(this.drive.discoveryKey, LOOKUP_CONFIG)
  }

  async resolveFile (name) {
    name = !name || name === '/' ? '/index.html' : name
    try {
      const stat = await this.drive.promises.stat(name)
      return { name, stat }
    } catch (error) {
      if (error.code !== 'ENOENT' || extname(name)) throw error
      return this.resolveFile('/index.html')
    }
  }

  createReadStream (name, scheme, host) {
    this.lastReadTime = Date.now()
    const stream = this.drive.createReadStream(name)
    if (!WEB_APP_CODE_EXTENSIONS.includes(extname(name))) return stream
    if (!(scheme && host)) {
      throw new Error('createReadStream requires a scheme and host for .html .js and .css files')
    }
    return stream.pipe(this.constructor.hyperUrlTransformer(scheme, host))
  }

  destroy () {
    // Todo: remove hyperdrive from storage
    return this.client.network.configure(this.drive.discoveryKey, FORGET_CONFIG)
  }
}
