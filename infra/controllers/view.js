import process from 'process'
import { join, extname } from 'path'
import { constants as http2Constants } from 'http2'
import mime from 'mime-types'

const {
  HTTP2_HEADER_PATH,
  HTTP2_HEADER_METHOD,
  HTTP_STATUS_NOT_FOUND,
  HTTP_STATUS_INTERNAL_SERVER_ERROR
} = http2Constants;

const PUBLIC_DIR = join(process.cwd(), 'public')

export class ViewController {
  handleRequest (stream, headers) {
    if (headers[HTTP2_HEADER_METHOD] !== 'GET') return false
    this.serveStaticAsset(stream, headers)
    return true
  }

  serveStaticAsset(stream, headers) {
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

    stream.respondWithFile(join(PUBLIC_DIR, name), responseHeaders, { onError })
  }
}
