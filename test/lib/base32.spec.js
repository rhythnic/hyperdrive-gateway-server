/* eslint-env mocha */
import assert from 'assert'
import { hexToBase32, base32ToBuffer, BASE32_PATTERN } from '../../lib/base32.js'

describe('base32', () => {
  const key = '34f4c3f0bcf6bf5c39d7814d373946d8f04da5b4a525d940c98309cafb111d93'

  describe('hexToBase32', () => {
    it('converts a hex string to base32', () => {
      assert(hexToBase32(key), new RegExp(`^${BASE32_PATTERN}+$`, 'i'))
    })
  })

  describe('base32ToBuffer', () => {
    it('converts a base32 string to a buffer', () => {
      const base32Key = hexToBase32(key)
      assert.strictEqual(base32ToBuffer(base32Key).toString('hex'), key)
    })
  })
})
