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

export class GatewayHyperdrive {
  static hexToBase32 (str) {
    return hexToBase32(str)
  }

  static base32ToBuffer (str) {
    return base32ToBuffer(str)
  }

  static isValidBase32Key (key) {
    return BASE32_KEY_REGEX.test(key)
  }

  static hyperUrlTransformer (scheme, host) {
    return replaceStream(
      HYPER_URL_REGEX,
      (_, preceedingChar, key) => `${preceedingChar}${scheme}://${this.hexToBase32(key)}.${host}`,
      HYPER_URL_TRANSFORMER_CONFIG
    )
  }

  static async resolveFile (drive, name) {
    name = !name || name === '/' ? '/index.html' : name
    try {
      const stat = await drive.promises.stat(name)
      return { name, stat }
    } catch (error) {
      if (error.code !== 'ENOENT' || extname(name)) throw error
      return this.resolveFile(drive, '/index.html')
    }
  }

  static createReadStream (drive, name, scheme, host) {
    const stream = drive.createReadStream(name)
    if (!WEB_APP_CODE_EXTENSIONS.includes(extname(name))) return stream
    if (!(scheme && host)) {
      throw new Error('createReadStream requires a scheme and host for .html .js and .css files')
    }
    return stream.pipe(this.hyperUrlTransformer(scheme, host))
  }
}
