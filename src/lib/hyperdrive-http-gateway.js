import Hyperdrive from 'hyperdrive'
import mime from 'mime-types'
import { extname } from 'path'

export const hyperdriveHttpGateway = function hyperdriveHttpGatewayFactory ({ corestore }) {
  const hyperdriveUriPattern = '^/([0-9a-fA-F]{64})(/?.*)$'

  return async function hyperdriveHttpGateway (req, res, next) {
    const driveInfo = parseUrl(hyperdriveUriPattern, req.url)
    if (!driveInfo) return next()
    const contentType = mime.contentType(extname(driveInfo.filePath))
    if (contentType) {
      res.set('Content-Type', contentType)
    }
    const content = await fetchHyperdriveFile(corestore, driveInfo)
    return res.send(replaceHyperdriveLinks(req.baseUrl, content))
  }
}

export function parseUrl (uriPattern, uri) {
  const match = new RegExp(uriPattern).exec(uri)
  return match && {
    publicKey: match[1],
    filePath: !match[2] || match[2] === '/' ? '/index.html' : match[2]
  }
}

export async function fetchHyperdriveFile (corestore, { publicKey, filePath }) {
  const drive = new Hyperdrive(corestore, Buffer.from(publicKey, 'hex'))
  await drive.promises.ready()
  return drive.promises.readFile(`${filePath}`, 'utf8')
}

export function replaceHyperdriveLinks (baseUrl, content) {
  return content.replace(
    /hyper:\/\/([^ ]+)/g,
    (_, publicKeyAndFilePath) => `${baseUrl}/${publicKeyAndFilePath}`
  )
}
