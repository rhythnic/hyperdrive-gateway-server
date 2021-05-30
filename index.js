import http from 'http'
import process from 'process'
import { promisify } from 'util'
import { setupHyperspace } from './lib/hyperspace.js'
import { HyperdriveController } from './controllers/hyperdrive.js'
import { ViewController } from './controllers/view.js'
import { mainRequestHandlerFactory } from './lib/main-request-handler.js'

async function main () {
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

  const server = http.createServer(mainRequestHandlerFactory(controllers))

  const shutdown = () => 
    Promise.all([
      promisify(server.close.bind(server)),
      hyperspace.cleanup()
    ])
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err)
      process.exit(0)
    })

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)

  const { PORT = '8080' } = process.env
  server.listen(PORT, () => {
    console.log(`listening on ${PORT}`)
  })
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
