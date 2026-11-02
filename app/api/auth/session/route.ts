import { ok, fail, handleError } from "../../../../lib/http";
import { readSession } from "../../../../lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await readSession();
    if (!user) return fail("Belum masuk", 401);
    return ok({ user });
  } catch (err) {
    return handleError(err);
  }
}
