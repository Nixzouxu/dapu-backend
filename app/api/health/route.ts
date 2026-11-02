import { prisma } from "../../../lib/prisma";
import { ok, handleError } from "../../../lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return ok({ db: true });
  } catch (err) {
    return handleError(err);
  }
}
