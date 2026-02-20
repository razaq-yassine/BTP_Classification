import * as jose from 'jose'

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'mySecretKey123456789012345678901234567890'
)
const EXPIRY = process.env.JWT_EXPIRY || '24h'

export async function signToken(
  payload: Record<string, unknown>,
  opts?: { expiresIn?: string }
): Promise<string> {
  return new jose.SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(opts?.expiresIn ?? EXPIRY)
    .sign(SECRET)
}

export async function verifyToken(token: string): Promise<{ sub: string; id: number; purpose?: string }> {
  const { payload } = await jose.jwtVerify(token, SECRET)
  return {
    sub: payload.sub as string,
    id: payload.id as number,
    purpose: payload.purpose as string | undefined,
  }
}
