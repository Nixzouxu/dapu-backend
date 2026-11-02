import { NextResponse } from "next/server";
import { ZodError } from "zod";

// Format response sesuai kontrak FE: { ok: true, data } atau { ok: false, error }.
export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true, data }, { status });
}

export function fail(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

// Error yang pesannya aman ditampilkan ke pengguna.
export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new HttpError(400, "Format JSON tidak valid");
  }
}

// Dipakai di blok catch semua route agar detail internal tidak bocor.
export function handleError(err: unknown) {
  if (err instanceof HttpError) return fail(err.message, err.status);
  if (err instanceof ZodError) {
    const first = err.issues[0];
    const field = first?.path.map(String).join(".");
    const message = first?.message ?? "Data tidak valid";
    return fail(field ? `${field}: ${message}` : message, 422);
  }
  console.error(err);
  return fail("Terjadi kesalahan pada server", 500);
}
