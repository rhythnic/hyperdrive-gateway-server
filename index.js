import { createSecureServer } from 'http2'
import process from 'process'
import { readFileSync } from 'fs'
import { promisify } from 'util'
import { join } from 'path'
import { GatewayHyperspace } from './services/gateway-hyperspace.js'
import { HyperdriveController } from './infra/controllers/hyperdrive.js'
import { ViewController } from './infra/controllers/view.js'
import { Router } from './infra/router.js'

async function main () {
  const hyperspace = new GatewayHyperspace({
    host: `gateway-${process.pid}`,
    storage: process.env.HYPERSPACE_STORAGE,
    noAnnounce: true,
    network: {
      ephemeral: false
    }
  })

  await hyperspace.setup()

  const router = new Router([
    new HyperdriveController(hyperspace.client),
    new ViewController(process.env.PUBLIC_ASSETS_DIRECTORY)
  ])

  const serverOptions = {
    key: readFileSync(process.env.SSL_KEY),
    cert: readFileSync(process.env.SSL_CERT)
  }

  const server = createSecureServer(serverOptions)
  server.on('error', (err) => console.error(err))
  server.on('stream', router.handleRequest)

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

  const { PORT = '443' } = process.env
  server.listen(PORT, () => {
    console.log(`listening on ${PORT}`)
  })
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
