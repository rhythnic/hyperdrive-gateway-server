import process from 'process'
import * as Eta from 'eta'
import { join } from 'path'

Eta.configure({
  cache: true,
  views: join(process.cwd(), 'views')
})

export class ViewController {
  constructor (viewData) {
    this.viewData = viewData
  }

  async handleRequest (stream, headers) {
    if (headers[':method'] !== 'GET') return false
    await this.renderLandingPage(stream, headers)
    return true
  }

  async renderLandingPage (stream, headers) {
    const body = await Eta.renderFile('./landing.eta', this.viewData)
    stream.respond({
      'content-length': Buffer.byteLength(body),
      'content-type': 'text/html; charset=utf-8',
      ':status': 200
    })
    stream.end(body)
  }
}
