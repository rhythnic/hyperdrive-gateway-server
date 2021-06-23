import { join, extname } from 'path'
import { constants as http2Constants } from 'http2'
import { constants as fsConstants } from 'fs'
import { access as fsAccess } from 'fs/promises'
import mime from 'mime-types'

const {
  HTTP2_HEADER_PATH,
  HTTP2_HEADER_METHOD,
  HTTP_STATUS_NOT_FOUND,
  HTTP_STATUS_INTERNAL_SERVER_ERROR
} = http2Constants

export class ViewController {
  constructor ({ staticDir }) {
    this.staticDir = staticDir
    this.canServeStatic = false
  }

  async initialize () {
    if (!this.staticDir) return
    await fsAccess(this.staticDir, fsConstants.R_OK)
    this.canServeStatic = true
  }

  handleRequest (stream, headers) {
    if (headers[HTTP2_HEADER_METHOD] !== 'GET' || !this.canServeStatic) return false
    this.serveStaticAsset(stream, headers)
    return true
  }

  serveStaticAsset (stream, headers) {
    const extension = extname(headers[HTTP2_HEADER_PATH])
    const name = extension ? headers[HTTP2_HEADER_PATH] : '/index.html'

    const onError = (err) => {
      console.log(err)
      stream.respond({
        ':status': err.code === 'ENOENT' ? HTTP_STATUS_NOT_FOUND : HTTP_STATUS_INTERNAL_SERVER_ERROR
      })
      stream.end()
    }

    const responseHeaders = {
      'content-type': mime.lookup(extname(name))
    }

    stream.respondWithFile(join(this.staticDir, name), responseHeaders, { onError })
  }
}
