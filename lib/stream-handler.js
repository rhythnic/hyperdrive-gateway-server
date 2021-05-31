export function streamHandler (controllers) {
  return async function streamHandler (stream, headers) {
    try {
      let handled = false
      for (let i = 0; i < controllers.length; i++) {
        handled = await controllers[i].handleRequest(stream, headers)
        if (handled) break
      }
      if (!handled) {
        stream.respond({
          'content-type': 'text/html; charset=utf-8',
          ':status': 404
        })
        stream.end('<h1>Not found</h1>')
      }
    } catch (error) {
      stream.respond({
        'content-type': 'text/html; charset=utf-8',
        ':status': 500
      })
      stream.end('<h1>Server error</h1>')
    }
  }
}
