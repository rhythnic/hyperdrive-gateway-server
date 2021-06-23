// not used currently
// might be used in the future when removing storage is supported
import { readdir } from 'fs/promises'
import { join as joinPath } from 'path'
import { PUBLIC_KEY_PATTERN } from './gateway-hyperdrive.js'

const PUBLIC_KEY_REGEX = new RegExp(PUBLIC_KEY_PATTERN, 'i')

export class StorageManager {
  static async coreIndex (dir, index = {}) {
    const direntsForRecursion = []
    const dirents = await readdir(dir, { withFileTypes: true })
    dirents
      .filter(x => x.isDirectory())
      .forEach(dirent => {
        if (PUBLIC_KEY_REGEX.test(dirent.name)) {
          index[dirent.name] = 0
        } else {
          direntsForRecursion.push(dirent)
        }
      })
    await Promise.all(
      direntsForRecursion.map(dirent => this.coreIndex(joinPath(dir, dirent.name), index))
    )
    return index
  }
}
