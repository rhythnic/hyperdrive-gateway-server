import {
  Client as HyperspaceClient,
  Server as HyperspaceServer
} from 'hyperspace'

export async function setupHyperspace ({ storage, host } = {}) {
  let client
  let server
  const serverOpts = { storage, host }
  const clientOpts = { host }

  try {
    client = new HyperspaceClient(clientOpts)
    await client.ready()
  } catch (e) {
    // no daemon, start it in-process
    server = new HyperspaceServer(serverOpts)
    await server.ready()
    client = new HyperspaceClient(clientOpts)
    await client.ready()
  }

  return {
    client,
    async cleanup () {
      await client.close()
      if (server) {
        console.log('Shutting down Hyperspace, this may take a few seconds...')
        await server.stop()
      }
    }
  }
}
