import { createSecureServer } from 'http2'
import process from 'process'
import { readFileSync } from 'fs'
import { promisify } from 'util'
import Corestore from 'corestore'
import Networker from '@corestore/networker'
import { HyperdriveManager } from './services/hyperdrive-manager.js'
import { HyperdriveController } from './infra/controllers/hyperdrive.js'
import { ViewController } from './infra/controllers/view.js'
import { Router } from './infra/router.js'

async function main () {
  const corestore = new Corestore(process.env.CORE_STORAGE)
  await corestore.ready()
  const networker = new Networker(corestore)

  const driveManager = new HyperdriveManager({
    corestore,
    networker
  })

  const router = new Router([
    new HyperdriveController({ driveManager }),
    new ViewController({ staticDir: process.env.PUBLIC_ASSETS_DIRECTORY })
  ])

  await router.initialize()

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
      networker.close()
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
