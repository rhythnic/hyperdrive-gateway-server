import Hyperdrive from 'hyperdrive'
import simple from 'simple-mock'
import process from 'process'
import storage from 'random-access-memory'

export const HYPERSPACE_OPTIONS = {
  storage,
  host: `hyperspace-${process.pid}`,
  noAnnounce: true,
  network: {
    ephemeral: true
  }
}

export async function buildDrive (client, filePath, content) {
  const drive = new Hyperdrive(client.corestore())
  await drive.promises.ready()
  await drive.promises.writeFile(filePath, content)
  return drive
}

export function mockConsoleLog () {
  const log = simple.stub()
  global.console.log = log
}
