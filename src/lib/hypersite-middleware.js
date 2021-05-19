import Hyperdrive from 'hyperdrive';
import mime from 'mime-types';
import { extname } from 'path';

export const hypersite = function hypersiteMiddlewareFactory({ prefix, coreStore }) {
  const hypersiteUriPattern = `${prefix}\/([^/]+)(\/?.*)$`;

  return async function hypersite(req, res, next) {
    const driveInfo = parseUrl(hypersiteUriPattern, req.url);
    if (!driveInfo) return next();
    const contentType = mime.contentType(extname(driveInfo.filePath));
    if (contentType) {
      res.set('Content-Type', contentType);
    }
    const content = await fetchHyperdriveFile(coreStore, driveInfo);
    return res.send(replaceHyperdriveLinks(prefix, content));
  }
}

export function parseUrl(uriPattern, uri) {
  const match = new RegExp(uriPattern).exec(uri);
  return !match ? null : {
    publicKey: match[1],
    filePath: !match[2] || match[2] === '/' ? '/index.html' : match[2]
  };
}

export async function fetchHyperdriveFile (coreStore, { publicKey, filePath }) {
  let drive = new Hyperdrive(coreStore, publicKey);
  await drive.promises.ready();
  return drive.promises.readFile(`${filePath}`, 'utf8');
}

export function replaceHyperdriveLinks(prefix, content) {
  const linkRegex = /hyper:\/\/([^ ]+)/g;
  const replacer = (_, publicKeyAndFilePath) => `${prefix}/${publicKeyAndFilePath}`;
  return content.replace(linkRegex, replacer);
}
