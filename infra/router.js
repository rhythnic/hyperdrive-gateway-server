import { constants as http2Constants } from 'http2'

const {
  HTTP_STATUS_NOT_FOUND,
  HTTP_STATUS_INTERNAL_SERVER_ERROR
} = http2Constants

export class Router {
  constructor (controllers) {
    this.controllers = controllers
    this.handleRequest = this.handleRequest.bind(this)
  }

  async handleRequest (stream, headers) {
    try {
      let handled = false
      for (let i = 0; i < this.controllers.length; i++) {
        handled = await this.controllers[i].handleRequest(stream, headers)
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
