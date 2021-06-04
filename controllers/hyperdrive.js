import http2 from 'http2'
import Hyperdrive from 'hyperdrive'
import mime from 'mime-types'
import { extname } from 'path'
import replaceStream from 'replacestream'
import base32Decode from 'base32-decode'
import { hexToBase32 } from '../lib/hex-to-base32.js'

const {
  HTTP2_HEADER_PATH,
  HTTP2_HEADER_METHOD,
  HTTP2_HEADER_AUTHORITY,
  HTTP2_HEADER_SCHEME,
  HTTP_STATUS_NOT_FOUND,
  HTTP_STATUS_MOVED_PERMANENTLY
} = http2.constants;

const HYPER_CODE_DEPENDENCY_REGEX = /(src|href)=["']hyper:\/\/([0-9a-fA-F]{64})(\/?.*)["']/g
const PUBLIC_KEY_REGEX = /([0-9a-fA-F]{64})/
const ROUTE_REGEX = /^(\/hyper)\/([0-9a-fA-F]{64})(\/?.*)$/

const NETWORK_CONFIG = {
  announce: false,
  lookup: true
}

const CODE_DEPENDENCY_TRANSFORMER_CONFIG = {
  maxMatchLen: 200
}

const BASE32_METHOD = 'Crockford'

const CODE_EXTENSIONS = ['.html', '.js', '.css']

export class HyperdriveController {
  constructor (client) {
    this.client = client
  }

  static redirectRouteToSubdomain(stream, headers, { publicKey, filePath }) {
    const scheme = headers[HTTP2_HEADER_SCHEME]
    const authority = headers[HTTP2_HEADER_AUTHORITY]
    stream.respond({
      ':status': HTTP_STATUS_MOVED_PERMANENTLY,
      'Location' : `${scheme}://${hexToBase32(publicKey)}.${authority}${filePath}`
    })
    stream.end()
  }

  static hyperCodeDependencyTransformer (headers) {
    // support esm imports and dynamic imports
    // support css imports
    const scheme = headers[HTTP2_HEADER_SCHEME]
    const host = headers[HTTP2_HEADER_AUTHORITY].split('.').slice(1).join('.')
    return replaceStream(
      HYPER_CODE_DEPENDENCY_REGEX,
      (match, attr, publicKey, filePath) => `${attr}="${scheme}://${hexToBase32(publicKey)}.${host}${filePath}"`,
      CODE_DEPENDENCY_TRANSFORMER_CONFIG
    )
  }

  async handleRequest (stream, headers) {
    if (headers[HTTP2_HEADER_METHOD] !== 'GET') return false;
    const authorityParts = headers[HTTP2_HEADER_AUTHORITY].split('.')
    if (authorityParts.length === 3) {
      const publicKeyBuffer = Buffer.from(base32Decode(authorityParts[0], BASE32_METHOD))
      if (PUBLIC_KEY_REGEX.test(publicKeyBuffer.toString('hex'))) {
        await this.serveHyperdriveFile(stream, headers, { publicKeyBuffer, filePath: headers[HTTP2_HEADER_PATH] })
        return true
      }
    } else if (authorityParts.length === 2) {
      const origin = headers[HTTP2_HEADER_AUTHORITY]
      const routeMatch = new RegExp(ROUTE_REGEX).exec(headers[HTTP2_HEADER_PATH])
      if (routeMatch) {
        this.constructor.redirectRouteToSubdomain(stream, headers, {
          publicKey: routeMatch[2],
          filePath: routeMatch[3]
        })
        return true
      }
    }
    return false
  }

  async serveHyperdriveFile (stream, headers, { publicKeyBuffer, filePath }) {
    filePath = !filePath || filePath === '/' ? '/index.html' : filePath
    const ext = extname(filePath)
    try {
      const drive = new Hyperdrive(this.client.corestore(), publicKeyBuffer)
      await drive.promises.ready()
      await this.client.network.configure(drive.discoveryKey, NETWORK_CONFIG)
      const stat = await drive.promises.stat(filePath)
      stream.respond({
        'content-length': stat.size,
        'content-type': mime.contentType(extname(filePath)) || 'text/plain; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        ':status': 200
      })
      let res = drive.createReadStream(filePath)
      if (CODE_EXTENSIONS.includes(ext)) {
        res = res.pipe(this.constructor.hyperCodeDependencyTransformer(headers))
      }
      res.pipe(stream)
    } catch (error) {
      console.error(error)
      stream.respond({
        'content-type': 'text/html; charset=utf-8',
        ':status': HTTP_STATUS_NOT_FOUND
      })
      stream.end('<h1>Not found</h1>')
    }
  }
}
