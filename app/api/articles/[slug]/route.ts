import { prisma } from "../../../../lib/prisma";
import { ok, handleError, HttpError } from "../../../../lib/http";
import { serializeArticle } from "../../../../lib/public-content";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    if (!/^[a-z0-9-]{1,200}$/.test(slug)) throw new HttpError(404, "Artikel tidak ditemukan");
    const row = await prisma.article.findUnique({ where: { slug } });
    if (!row) throw new HttpError(404, "Artikel tidak ditemukan");
    return ok(serializeArticle(row));
  } catch (err) {
    return handleError(err);
  }
}
