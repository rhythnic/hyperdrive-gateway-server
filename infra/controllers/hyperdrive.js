import { constants as http2Constants } from 'http2'
import mime from 'mime-types'
import { extname } from 'path'
import { GatewayHyperdrive, PUBLIC_KEY_PATTERN } from '../../services/gateway-hyperdrive.js'

const {
  HTTP2_HEADER_PATH,
  HTTP2_HEADER_METHOD,
  HTTP2_HEADER_AUTHORITY,
  HTTP2_HEADER_SCHEME,
  HTTP_STATUS_NOT_FOUND,
  HTTP_STATUS_MOVED_PERMANENTLY,
  HTTP_STATUS_INTERNAL_SERVER_ERROR
} = http2Constants

const PUBLIC_KEY_ROUTE_PATTERN = `^/hyper/${PUBLIC_KEY_PATTERN}(/?.*)$`
const PUBLIC_KEY_ROUTE_REGEX = new RegExp(PUBLIC_KEY_ROUTE_PATTERN, 'i')

export class HyperdriveController {
  static fileResponseHeaders (name, size) {
    return {
      'content-length': size,
      'content-type': mime.contentType(extname(name)) || 'text/plain; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      ':status': 200
    }
  }

  static redirectRouteToSubdomain (stream, headers) {
    const match = new RegExp(PUBLIC_KEY_ROUTE_REGEX).exec(headers[HTTP2_HEADER_PATH])
    if (!match) {
      throw new Error('Headers path does not match hyperdrive route pattern')
    }
    const key = match[1]
    const name = match[2]
    const scheme = headers[HTTP2_HEADER_SCHEME]
    const authority = headers[HTTP2_HEADER_AUTHORITY]
    stream.respond({
      ':status': HTTP_STATUS_MOVED_PERMANENTLY,
      Location: `${scheme}://${GatewayHyperdrive.hexToBase32(key)}.${authority}${name}`
    })
    stream.end()
  }

  constructor ({ driveManager }) {
    this.driveManager = driveManager
  }

  async handleRequest (stream, headers) {
    if (headers[HTTP2_HEADER_METHOD] !== 'GET') return false
    const authorityParts = headers[HTTP2_HEADER_AUTHORITY].split('.')
    const subdomain = authorityParts.length === 3 && authorityParts[0]
    if (subdomain && GatewayHyperdrive.isValidBase32Key(subdomain)) {
      const domainHost = `${authorityParts[1]}.${authorityParts[2]}`
      await this.serveHyperdriveFile(stream, headers, subdomain, domainHost)
      return true
    } else if (PUBLIC_KEY_ROUTE_REGEX.test(headers[HTTP2_HEADER_PATH])) {
      this.constructor.redirectRouteToSubdomain(stream, headers)
      return true
    }
    return false
  }

  async serveHyperdriveFile (stream, headers, subdomain, domainHost) {
    try {
      const drive = await this.driveManager.create(subdomain)
      const { name, stat } = await GatewayHyperdrive.resolveFile(drive, headers[HTTP2_HEADER_PATH])
      stream.respond(this.constructor.fileResponseHeaders(name, stat.size))
      GatewayHyperdrive.createReadStream(drive, name, headers[HTTP2_HEADER_SCHEME], domainHost).pipe(stream)
    } catch (error) {
      const notFound = error.code === 'ENOENT'
      console[notFound ? 'log' : 'error'](error)
      stream.respond({ ':status': notFound ? HTTP_STATUS_NOT_FOUND : HTTP_STATUS_INTERNAL_SERVER_ERROR })
      stream.end()
    }
  }
}
