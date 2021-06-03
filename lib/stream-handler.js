import http2 from 'http2'

const {
  HTTP_STATUS_NOT_FOUND,
  HTTP_STATUS_INTERNAL_SERVER_ERROR
} = http2.constants;

export function streamHandler (controllers) {
  return async function streamHandler (stream, headers) {
    // console.log(headers)
    try {
      let handled = false
      for (let i = 0; i < controllers.length; i++) {
        handled = await controllers[i].handleRequest(stream, headers)
        if (handled) break
      }
      if (!handled) {
        stream.respond({ ':status': HTTP_STATUS_NOT_FOUND })
        stream.end()
      }
    } catch (error) {
      stream.respond({ ':status': HTTP_STATUS_INTERNAL_SERVER_ERROR })
      stream.end()
    }
  }
}
