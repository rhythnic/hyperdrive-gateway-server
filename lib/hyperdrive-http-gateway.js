import Hyperdrive from 'hyperdrive'
import mime from 'mime-types'
import { extname } from 'path'

export const hyperdriveHttpGateway = function hyperdriveHttpGatewayFactory ({ client }) {
  const hyperdriveUriPattern = '^/([0-9a-fA-F]{64})(/?.*)$'

  return async function hyperdriveHttpGateway (req, res, next) {
    try {
      const driveInfo = parseUrl(hyperdriveUriPattern, req.url)
      if (!driveInfo) return next()
      const contentType = mime.contentType(extname(driveInfo.filePath))
      if (contentType) {
        res.set('Content-Type', contentType)
      }
      const content = await fetchHyperdriveFile(client, driveInfo)
      return res.send(replaceHyperdriveLinks(req.baseUrl, content))
    } catch (error) {
      next(error)
    }
  }
}

export function parseUrl (uriPattern, uri) {
  const match = new RegExp(uriPattern).exec(uri)
  return match && {
    publicKey: match[1],
    filePath: !match[2] || match[2] === '/' ? '/index.html' : match[2]
  }
}

export async function fetchHyperdriveFile (client, { publicKey, filePath }) {
  let drive
  try {
    drive = new Hyperdrive(client.corestore(), Buffer.from(publicKey, 'hex'))
  } catch (error) {
    console.error('CAUGHT ERROR', error)
    throw error
  }
  await drive.promises.ready()
  await client.network.configure(drive.discoveryKey, { announce: false, lookup: true })
  return drive.promises.readFile(filePath, 'utf8')
}

export function replaceHyperdriveLinks (baseUrl, content) {
  return content.replace(
    /hyper:\/\/([^ ]+)/g,
    (_, publicKeyAndFilePath) => `${baseUrl}/${publicKeyAndFilePath}`
  )
}
