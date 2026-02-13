import * as jose from 'jose'

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'mySecretKey123456789012345678901234567890'
)
const EXPIRY = process.env.JWT_EXPIRY || '24h'

export async function signToken(payload: { sub: string; id: number }): Promise<string> {
  return new jose.SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(EXPIRY)
    .sign(SECRET)
}

export async function verifyToken(token: string): Promise<{ sub: string; id: number }> {
  const { payload } = await jose.jwtVerify(token, SECRET)
  return { sub: payload.sub as string, id: payload.id as number }
}
