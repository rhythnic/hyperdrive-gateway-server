import { createSecureServer } from 'http2'
import process from 'process'
import { readFileSync } from 'fs'
import { promisify } from 'util'
import { setupHyperspace } from './lib/hyperspace.js'
import { HyperdriveController } from './controllers/hyperdrive.js'
import { ViewController } from './controllers/view.js'
import { streamHandler } from './lib/stream-handler.js'

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

  const serverOptions = {
    key: readFileSync(process.env.SSL_KEY),
    cert: readFileSync(process.env.SSL_CERT)
  }

  const server = createSecureServer(serverOptions)
  server.on('error', (err) => console.error(err))
  server.on('stream', streamHandler(controllers))

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
