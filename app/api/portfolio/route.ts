import { prisma } from "../../../lib/prisma";
import { ok, handleError } from "../../../lib/http";
import { serializePortfolio } from "../../../lib/public-content";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await prisma.portfolioItem.findMany({ orderBy: { id: "asc" } });
    return ok(rows.map(serializePortfolio));
  } catch (err) {
    return handleError(err);
  }
}
