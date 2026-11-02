import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../../../../lib/prisma";
import { ok, fail, handleError, readJson } from "../../../../lib/http";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  sessionCookieOptions,
  signSession,
} from "../../../../lib/auth";
import { checkBlocked, recordFailure, clearFailures } from "../../../../lib/rate-limit";

export const dynamic = "force-dynamic";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("format email tidak valid").max(190),
  password: z.string().min(1, "wajib diisi").max(200),
});

// Hash palsu supaya waktu respons mirip walaupun email tidak terdaftar.
const DUMMY_HASH = bcrypt.hashSync("kata-sandi-palsu", 12);

export async function POST(request: Request) {
  try {
    const body = loginSchema.parse(await readJson(request));

    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "tidak-diketahui";
    const ipKey = `ip:${ip}|${body.email}`;
    const emailKey = `email:${body.email}`;

    const wait = Math.max(checkBlocked(ipKey, 5), checkBlocked(emailKey, 10));
    if (wait > 0) {
      const res = fail("Terlalu banyak percobaan masuk. Coba lagi nanti.", 429);
      res.headers.set("Retry-After", String(wait));
      return res;
    }

    const admin = await prisma.admin.findUnique({ where: { email: body.email } });
    const valid = await bcrypt.compare(body.password, admin?.passwordHash ?? DUMMY_HASH);

    if (!admin || !valid) {
      recordFailure(ipKey);
      recordFailure(emailKey);
      return fail("Email atau kata sandi salah", 401);
    }

    clearFailures(ipKey);
    clearFailures(emailKey);

    const user = { id: String(admin.id), email: admin.email, name: admin.name, role: "admin" as const };
    const token = await signSession(user);

    const res = ok({ user });
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(SESSION_MAX_AGE));
    return res;
  } catch (err) {
    return handleError(err);
  }
}
