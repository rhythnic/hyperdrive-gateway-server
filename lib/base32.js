import base32Encode from 'base32-encode'
import base32Decode from 'base32-decode'

const BASE32_METHOD = 'Crockford'
export const BASE32_PATTERN = '[0-9ABCDEFGHJKMNPQRSTVWXYZ]'

export function hexToBase32 (hexString) {
  if (hexString.length % 2 !== 0) {
    throw new Error('Invalid hexString')
  }
  const arrayBuffer = new Uint8Array(hexString.length / 2)
  for (let i = 0; i < hexString.length; i += 2) {
    const byteValue = parseInt(hexString.substr(i, 2), 16)
    if (isNaN(byteValue)) {
      throw new Error('Invalid hexString')
    }
    arrayBuffer[i / 2] = byteValue
  }
  return base32Encode(arrayBuffer, BASE32_METHOD)
}

export function base32ToBuffer (base32Str) {
  return Buffer.from(base32Decode(base32Str, BASE32_METHOD))
}
