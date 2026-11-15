const encoder = new TextEncoder()

const toBase64 = (bytes: Uint8Array) => {
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary)
}

const fromBase64 = (value: string): Uint8Array<ArrayBuffer> => {
  const binary = atob(value)
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

const derivePassword = async (
  password: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number,
) => {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    keyMaterial,
    256,
  )
  return new Uint8Array(bits)
}

export const hashPassword = async (password: string, iterations: number) => {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const hash = await derivePassword(password, salt, iterations)
  return { hash: toBase64(hash), salt: toBase64(salt) }
}

export const verifyPassword = async (
  password: string,
  expectedHash: string,
  salt: string,
  iterations: number,
) => {
  const actual = await derivePassword(password, fromBase64(salt), iterations)
  const expected = fromBase64(expectedHash)
  if (actual.length !== expected.length) return false
  let difference = 0
  for (let index = 0; index < actual.length; index += 1) {
    difference |= actual[index] ^ expected[index]
  }
  return difference === 0
}
