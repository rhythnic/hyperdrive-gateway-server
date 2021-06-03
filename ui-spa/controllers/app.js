import { hexToBase32 } from '../lib/hex-to-base32.js'

export class AppController {
  openHyperdriveTab (event) {
    const hyperdriveUri = event.detail.formData.get('uri')
    const [_, publicKey, filePath] = /^hyper:\/\/([0-9a-fA-F]{64})(\/?.*)$/.exec(hyperdriveUri)
    const { location } =  window
    const publicKeyBase32 = hexToBase32(publicKey)
    const gatewayUri = `${location.protocol}//${publicKeyBase32}.${location.host}${filePath}`
    window.open(gatewayUri, "_blank");
  }
}
