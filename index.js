import http from 'http'
import { setupHyperspace } from './lib/hyperspace.js'
import { setupExpress } from './lib/express-app.js'

async function main () {
  const hyperspace = await setupHyperspace({
    host: process.env.HYPERSPACE_HOST,
    storage: process.env.HYPERSPACE_STORAGE
  })

  const corestore = hyperspace.client.corestore()

  const expressApp = setupExpress({
    client: hyperspace.client,
    corestore
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
