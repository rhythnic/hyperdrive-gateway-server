import base32Encode from 'base32-encode'

const BASE32_METHOD = 'Crockford'

export function hexToBase32(hexString){
  if (hexString.length % 2 !== 0) {
    throw "Invalid hexString"
  }
  const arrayBuffer = new Uint8Array(hexString.length / 2);
  for (let i = 0; i < hexString.length; i += 2) {
    const byteValue = parseInt(hexString.substr(i, 2), 16)
    if (isNaN(byteValue)){
      throw "Invalid hexString"
    }
    arrayBuffer[i/2] = byteValue
  }
  return base32Encode(arrayBuffer, BASE32_METHOD)
}