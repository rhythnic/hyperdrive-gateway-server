import Hyperdrive from 'hyperdrive'
import mime from 'mime-types'
import { extname } from 'path'

export class HyperdriveController {
  static PAGE_DEPENDENCY_REGEX = /(src|href)=["']hyper:\/\/(.+)["']/g

  static GATEWAY_ROUTE_REGEX = /^(\/hyper)\/([0-9a-fA-F]{64})(\/?.*)$/
  
  static NETWORK_CONFIG = {
    announce: false,
    lookup: true
  }

  constructor(client) {
    this.client = client;
  }

  async handleRequest(req, res, url) {
    if (req.method === 'GET') {
      let match = new RegExp(this.constructor.GATEWAY_ROUTE_REGEX).exec(url.pathname)
      if (match) {
        await this.serveHyperdriveFile(req, res, match, url)
        return true
      }
    }
    return false
  }

  async serveHyperdriveFile(req, res, params) {
    let [_, basePath, publicKey, filePath] = params
    filePath = !filePath || filePath === '/' ? '/index.html' : filePath
    try {
      const drive = new Hyperdrive(this.client.corestore(), Buffer.from(publicKey, 'hex'))
      await drive.promises.ready()
      await this.client.network.configure(drive.discoveryKey, this.constructor.NETWORK_CONFIG)
      const body = await drive.promises.readFile(filePath, 'utf8')
      const contentType = mime.contentType(extname(filePath))
      if (contentType) res.setHeader('Content-Type', contentType)
      res.statusCode = 200
      res.end(body.replace(
        this.constructor.PAGE_DEPENDENCY_REGEX,
        (match, attr, publicKeyAndFilePath) => `${attr}="${basePath}/${publicKeyAndFilePath}"`
      ))
    } catch (error) {
      res.statusCode = 404
      res.end('File not found')
    }
  }
}