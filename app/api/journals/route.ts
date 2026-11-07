import { prisma } from "../../../lib/prisma";
import { ok, handleError } from "../../../lib/http";
import { serializeJournal } from "../../../lib/public-content";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await prisma.journal.findMany({ orderBy: { id: "asc" } });
    return ok(rows.map(serializeJournal));
  } catch (err) {
    return handleError(err);
  }
}
