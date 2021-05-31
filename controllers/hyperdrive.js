import Hyperdrive from 'hyperdrive'
import mime from 'mime-types'
import { extname } from 'path'

const PAGE_DEPENDENCY_REGEX = /(src|href)=["']hyper:\/\/(.+)["']/g

const GATEWAY_ROUTE_REGEX = /^(\/hyper)\/([0-9a-fA-F]{64})(\/?.*)$/

const NETWORK_CONFIG = {
  announce: false,
  lookup: true
}

export class HyperdriveController {
  constructor (client) {
    this.client = client
  }

  static replaceDependencyLinks (basePath, content) {
    return content.replace(
      PAGE_DEPENDENCY_REGEX,
      (match, attr, publicKeyAndFilePath) => `${attr}="${basePath}/${publicKeyAndFilePath}"`
    )
  }

  async handleRequest (stream, headers) {
    if (headers[':method'] === 'GET') {
      const match = new RegExp(GATEWAY_ROUTE_REGEX).exec(headers[':path'])
      if (match) {
        await this.serveHyperdriveFile(stream, headers, match)
        return true
      }
    }
    return false
  }

  async serveHyperdriveFile (stream, headers, params) {
    const basePath = params[1]
    const publicKey = params[2]
    const filePath = !params[3] || params[3] === '/' ? '/index.html' : params[3]
    try {
      const drive = new Hyperdrive(this.client.corestore(), Buffer.from(publicKey, 'hex'))
      await drive.promises.ready()
      await this.client.network.configure(drive.discoveryKey, NETWORK_CONFIG)
      let body = await drive.promises.readFile(filePath, 'utf8')
      body = this.constructor.replaceDependencyLinks(basePath, body)
      stream.respond({
        'content-length': Buffer.byteLength(body),
        'content-type': mime.contentType(extname(filePath)) || 'text/plain; charset=utf-8',
        ':status': 200
      })
      stream.end(body)
    } catch (error) {
      stream.respond({
        'content-type': 'text/html; charset=utf-8',
        ':status': 404
      })
      stream.end('<h1>Not found</h1>')
    }
  }
}
