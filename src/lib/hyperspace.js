import {
  Client as HyperspaceClient,
  Server as HyperspaceServer
} from 'hyperspace';

export async function setupHyperspace () {
  let client
  let server
  
  try {
    client = new HyperspaceClient()
    await client.ready()
  } catch (e) {
    // no daemon, start it in-process
    server = new HyperspaceServer()
    await server.ready()
    client = new HyperspaceClient()
    await client.ready()
  }

  const coreStore = client.corestore();
  
  return {
    client,
    coreStore,
    async cleanup () {
      await client.close()
      if (server) {
        console.log('Shutting down Hyperspace, this may take a few seconds...')
        await server.stop()
      }
    }
  }
}