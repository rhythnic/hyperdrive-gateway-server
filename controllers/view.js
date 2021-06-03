import process from 'process'
import { join, extname } from 'path'
import http2 from 'http2'
import mime from 'mime-types'

const {
  HTTP2_HEADER_PATH,
  HTTP2_HEADER_METHOD,
  HTTP_STATUS_NOT_FOUND,
  HTTP_STATUS_INTERNAL_SERVER_ERROR
} = http2.constants;

const PUBLIC_DIR = join(process.cwd(), 'public')

export class ViewController {
  handleRequest (stream, headers) {
    if (headers[HTTP2_HEADER_METHOD] !== 'GET') return false
    this.serveStaticAsset(stream, headers)
    return true
  }

  serveStaticAsset(stream, headers) {
    // if no file extension, serve index.html
    const fileExtension = extname(headers[HTTP2_HEADER_PATH])
    const filePath = fileExtension ? headers[HTTP2_HEADER_PATH] : '/index.html'

    const onError = (err) => {
      console.log(err)
      stream.respond({
        ':status': err.code === 'ENOENT' ? HTTP_STATUS_NOT_FOUND : HTTP_STATUS_INTERNAL_SERVER_ERROR
      })
      stream.end()
    }

    const responseHeaders = {
      'content-type': mime.lookup(extname(filePath))
    }

    stream.respondWithFile(join(PUBLIC_DIR, filePath), responseHeaders, { onError })
  }
}
