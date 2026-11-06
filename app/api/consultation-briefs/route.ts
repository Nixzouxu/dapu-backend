import { ok, fail, handleError, readJson } from "../../../lib/http";
import {
  briefSchema,
  createBrief,
  guardSubmission,
  isHoneypotFilled,
  notifyNewBrief,
} from "../../../lib/public-forms";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const wait = guardSubmission(request);
    if (wait > 0) {
      const res = fail("Terlalu banyak pengiriman. Coba lagi nanti.", 429);
      res.headers.set("Retry-After", String(wait));
      return res;
    }

    const raw = await readJson(request);
    // Bot yang mengisi kolom jebakan mendapat jawaban "berhasil", tetapi tidak disimpan.
    if (isHoneypotFilled(raw)) {
      return ok({ id: "0", reference: "BRF-0000-0000", status: "Baru", createdAt: new Date().toISOString() }, 201);
    }

    const input = briefSchema.parse(raw);
    const brief = await createBrief(input);
    void notifyNewBrief(brief.reference, input);
    return ok(
      { id: String(brief.id), reference: brief.reference, status: "Baru", createdAt: brief.createdAt.toISOString() },
      201,
    );
  } catch (err) {
    return handleError(err);
  }
}
