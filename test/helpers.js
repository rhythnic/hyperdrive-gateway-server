import Hyperdrive from 'hyperdrive'
import simple from 'simple-mock'

export async function buildDrive (corestore, filePath, content) {
  const drive = new Hyperdrive(corestore)
  await drive.promises.ready()
  await drive.promises.writeFile(filePath, content)
  return drive.key.toString('hex')
}

export function mockConsoleLog () {
  const log = simple.stub()
  global.console.log = log
}
