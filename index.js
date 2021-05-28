import http from 'http'
import process from 'process'
import { setupHyperspace } from './lib/hyperspace.js'
import { setupExpress } from './lib/express-app.js'

async function main () {
  const hyperspace = await setupHyperspace({
    host: `gateway-${process.pid}`,
    storage: process.env.HYPERSPACE_STORAGE,
    noAnnounce: true,
    network: {
      ephemeral: false
    }
  })

  const expressApp = setupExpress({
    hyperspaceClient: hyperspace.client,
    viewData: {
      appName: process.env.APP_NAME
    }
  })

  const server = http.createServer(expressApp)

  process.on('SIGINT', () => {
    server.stop()
    hyperspace.cleanup()
    process.exit(0)
  })

  const { PORT = '8080' } = process.env
  server.listen(PORT, () => {
    console.log(`listening on ${PORT}`)
  })
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
