import process from 'process'
import * as Eta from "eta"
import { join } from 'path'

Eta.configure({
  cache: true,
  views: join(process.cwd(), 'views')
})

export class ViewController {
  constructor(viewData) {
    this.viewData = viewData
  }

  async handleRequest(req, res, url) {
    if (req.method !== 'GET') return false
    await this.renderLandingPage(req, res, url)
    return true
  }

  async renderLandingPage(req, res) {
    res.statusCode = 200
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.end(await Eta.renderFile('./landing.eta', this.viewData))
  }
}
