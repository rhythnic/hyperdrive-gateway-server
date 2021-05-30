import { URL } from 'url'

export function mainRequestHandlerFactory (controllers) {
  return async function mainRequestHandler (req, res) {
    try {
      const url = new URL(req.url, `${req.protocol}://${req.headers.host}`)
      let handled = false
      for (let i = 0; i < controllers.length; i++) {
        handled = await controllers[i].handleRequest(req, res, url)
        if (handled) break
      }
      if (!handled) {
        res.statusCode = 404
        res.end('Not found')
      }
    } catch (error) {
      console.error(error)
      res.statusCode = 500
      res.end('Server error')
    }
  }
}
