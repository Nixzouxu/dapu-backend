import { ok, fail, handleError, readJson } from "../../../lib/http";
import {
  contactSchema,
  createContact,
  guardSubmission,
  isHoneypotFilled,
  notifyNewContact,
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
    if (isHoneypotFilled(raw)) {
      return ok({ id: "0", createdAt: new Date().toISOString() }, 201);
    }

    const input = contactSchema.parse(raw);
    const message = await createContact(input);
    void notifyNewContact(input);
    return ok({ id: String(message.id), createdAt: message.createdAt.toISOString() }, 201);
  } catch (err) {
    return handleError(err);
  }
}
