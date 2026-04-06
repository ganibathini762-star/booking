import { SignJWT, jwtVerify } from "jose";
import { env } from "../config/env.js";

const accessSecret = new TextEncoder().encode(env.JWT_SECRET);
const refreshSecret = new TextEncoder().encode(env.JWT_REFRESH_SECRET);

export type TokenPayload = {
  sub: string;
  email: string;
  role: string;
};

export async function signAccessToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(env.JWT_EXPIRES_IN)
    .sign(accessSecret);
}

export async function signRefreshToken(payload: Pick<TokenPayload, "sub">): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(env.JWT_REFRESH_EXPIRES_IN)
    .sign(refreshSecret);
}

export async function verifyAccessToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, accessSecret);
    return payload as unknown as TokenPayload;
  } catch {
    return null;
  }
}

export async function verifyRefreshToken(token: string): Promise<{ sub: string } | null> {
  try {
    const { payload } = await jwtVerify(token, refreshSecret);
    return payload as { sub: string };
  } catch {
    return null;
  }
}
