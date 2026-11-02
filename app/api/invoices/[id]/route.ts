import { prisma } from "../../../../lib/prisma";
import { ok, handleError, HttpError } from "../../../../lib/http";
import { requireAdmin } from "../../../../lib/auth";
import { serializeInvoice } from "../../../../lib/invoice";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    if (!/^\d{1,9}$/.test(id)) throw new HttpError(404, "Invoice tidak ditemukan");

    const invoice = await prisma.invoice.findUnique({
      where: { id: Number(id) },
      include: { items: true },
    });
    if (!invoice) throw new HttpError(404, "Invoice tidak ditemukan");
    return ok(serializeInvoice(invoice));
  } catch (err) {
    return handleError(err);
  }
}
