import {
  Client as HyperspaceClient,
  Server as HyperspaceServer
} from 'hyperspace'

export class GatewayHyperspace {
  constructor (opts = {}) {
    this.opts = opts
    this._client = null
    this._server = null
  }

  get client () {
    return this._client
  }

  get server () {
    return this._server
  }

  async setup () {
    const clientOpts = { host: this.opts.host }
    try {
      this._client = new HyperspaceClient(clientOpts)
      await this.client.ready()
    } catch (e) {
      // no daemon, start it in-process
      this._server = new HyperspaceServer(this.opts)
      await this.server.ready()
      this._client = new HyperspaceClient(clientOpts)
      await this.client.ready()
    }
  }

  async cleanup () {
    await this.client.close()
    if (this.server) {
      console.log('Shutting down Hyperspace, this may take a few seconds...')
      await this.server.stop()
    }
  }
}
