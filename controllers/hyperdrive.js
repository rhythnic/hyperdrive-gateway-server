import http2 from 'http2'
import Hyperdrive from 'hyperdrive'
import mime from 'mime-types'
import { extname } from 'path'
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

const PAGE_DEPENDENCY_REGEX = /(src|href)=["']hyper:\/\/([0-9a-fA-F]{64})(\/?.*)["']/g
const PUBLIC_KEY_REGEX = /([0-9a-fA-F]{64})/
const ROUTE_REGEX = /^(\/hyper)\/([0-9a-fA-F]{64})(\/?.*)$/

const NETWORK_CONFIG = {
  announce: false,
  lookup: true
}

const BASE32_METHOD = 'Crockford'

export class HyperdriveController {
  constructor (client) {
    this.client = client
  }

  static redirectRouteToSubdomain(stream, { scheme, origin, publicKey, filePath }) {
    stream.respond({
      ':status': HTTP_STATUS_MOVED_PERMANENTLY,
      'Location' : `${scheme}://${hexToBase32(publicKey)}.${origin}${filePath}`
    })
    stream.end()
  }

  static replaceDependencyLinks (headers, origin, content) {
    const scheme = headers[HTTP2_HEADER_SCHEME]
    return content.replace(
      PAGE_DEPENDENCY_REGEX,
      (match, attr, publicKey, filePath) => `${attr}="${scheme}://${hexToBase32(publicKey)}.${origin}${filePath}"`
    )
  }

  async handleRequest (stream, headers) {
    if (headers[HTTP2_HEADER_METHOD] !== 'GET') return false;
    const authorityParts = headers[HTTP2_HEADER_AUTHORITY].split('.')
    if (authorityParts.length === 3) {
      const origin = `${authorityParts[1]}.${authorityParts[2]}`
      const publicKeyBuffer = Buffer.from(base32Decode(authorityParts[0], BASE32_METHOD))
      if (PUBLIC_KEY_REGEX.test(publicKeyBuffer.toString('hex'))) {
        await this.serveHyperdriveFile(stream, headers, { origin, publicKeyBuffer, filePath: headers[HTTP2_HEADER_PATH] })
        return true
      }
    } else if (authorityParts.length === 2) {
      const origin = headers[HTTP2_HEADER_AUTHORITY]
      const routeMatch = new RegExp(ROUTE_REGEX).exec(headers[HTTP2_HEADER_PATH])
      if (routeMatch) {
        this.constructor.redirectRouteToSubdomain(stream, {
          origin,
          scheme: headers[HTTP2_HEADER_SCHEME],
          publicKey: routeMatch[2],
          filePath: routeMatch[3]
        })
        return true
      }
    }
    return false
  }

  async serveHyperdriveFile (stream, headers, { origin, publicKeyBuffer, filePath }) {
    // https://docs.beakerbrowser.com/developers/frontends-.ui-folder
    filePath = !filePath || filePath === '/' ? '/index.html' : filePath
    try {
      const drive = new Hyperdrive(this.client.corestore(), publicKeyBuffer)
      await drive.promises.ready()
      await this.client.network.configure(drive.discoveryKey, NETWORK_CONFIG)
      let body = await drive.promises.readFile(filePath, 'utf8')
      body = this.constructor.replaceDependencyLinks(headers, origin, body)
      stream.respond({
        'content-length': Buffer.byteLength(body),
        'content-type': mime.contentType(extname(filePath)) || 'text/plain; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        ':status': 200
      })
      stream.end(body)
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
