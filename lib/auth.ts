import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "./prisma";
import { HttpError } from "./http";

export const SESSION_COOKIE = "dapu_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 hari

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: "admin";
};

function secretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET belum diisi atau kurang dari 32 karakter");
  }
  return new TextEncoder().encode(secret);
}

export function sessionCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

export async function signSession(user: SessionUser) {
  return new SignJWT({ role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey());
}

// Mengembalikan admin yang sedang masuk, atau null kalau sesi tidak ada atau tidak valid.
export async function readSession(): Promise<SessionUser | null> {
  const key = secretKey();
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  let sub: string | undefined;
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
    sub = payload.sub;
  } catch {
    return null;
  }

  const id = Number(sub);
  if (!Number.isInteger(id)) return null;

  const admin = await prisma.admin.findUnique({ where: { id } });
  if (!admin) return null;
  return { id: String(admin.id), email: admin.email, name: admin.name, role: "admin" };
}

// Dipakai di semua endpoint admin: panggil di awal, lempar 401 kalau belum masuk.
export async function requireAdmin() {
  const user = await readSession();
  if (!user) throw new HttpError(401, "Sesi tidak valid, silakan masuk kembali");
  return user;
}
