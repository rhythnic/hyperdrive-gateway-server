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

  async handleRequest (req, res, url) {
    if (req.method === 'GET') {
      const match = new RegExp(GATEWAY_ROUTE_REGEX).exec(url.pathname)
      if (match) {
        await this.serveHyperdriveFile(req, res, match, url)
        return true
      }
    }
    return false
  }

  async serveHyperdriveFile (req, res, params) {
    const basePath = params[1]
    const publicKey = params[2]
    const filePath = !params[3] || params[3] === '/' ? '/index.html' : params[3]
    try {
      const drive = new Hyperdrive(this.client.corestore(), Buffer.from(publicKey, 'hex'))
      await drive.promises.ready()
      await this.client.network.configure(drive.discoveryKey, NETWORK_CONFIG)
      const body = await drive.promises.readFile(filePath, 'utf8')
      const contentType = mime.contentType(extname(filePath))
      if (contentType) res.setHeader('Content-Type', contentType)
      res.statusCode = 200
      res.end(body.replace(
        PAGE_DEPENDENCY_REGEX,
        (match, attr, publicKeyAndFilePath) => `${attr}="${basePath}/${publicKeyAndFilePath}"`
      ))
    } catch (error) {
      res.statusCode = 404
      res.end('File not found')
    }
  }
}
