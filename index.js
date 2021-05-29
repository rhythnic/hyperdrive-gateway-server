import http from 'http'
import process from 'process'
import { URL } from 'url'
import { setupHyperspace } from './lib/hyperspace.js'
import { HyperdriveController } from './controllers/hyperdrive.js'
import { ViewController} from './controllers/view.js'

const hyperspace = await setupHyperspace({
  host: `gateway-${process.pid}`,
  storage: process.env.HYPERSPACE_STORAGE,
  noAnnounce: true,
  network: {
    ephemeral: false
  }
})

const controllers = [
  new HyperdriveController(hyperspace.client),
  new ViewController({ appName: process.env.APP_NAME })
]

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`)
    let handled = false
    for (let i  = 0; i < controllers.length; i++) {
      handled = await controllers[i].handleRequest(req, res, url)
      if (handled) break
    }
    if (!handled) {
      res.statusCode = 404
      res.end('Not found')
    }
  } catch (error) {
    console.error(error);
    res.statusCode = 500;
    res.end('Server error');
  }
})

function shutdown () {
  server.stop()
  hyperspace.cleanup()
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

const { PORT = '8080' } = process.env
server.listen(PORT, () => {
  console.log(`listening on ${PORT}`)
})
