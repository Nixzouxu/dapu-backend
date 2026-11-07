import { prisma } from "../../../lib/prisma";
import { ok, handleError } from "../../../lib/http";
import { serializeArticle } from "../../../lib/public-content";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await prisma.article.findMany({ orderBy: { id: "asc" } });
    return ok(rows.map(serializeArticle));
  } catch (err) {
    return handleError(err);
  }
}
