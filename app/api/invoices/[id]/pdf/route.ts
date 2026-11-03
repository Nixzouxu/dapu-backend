import { prisma } from "../../../../../lib/prisma";
import { handleError, HttpError } from "../../../../../lib/http";
import { requireAdmin } from "../../../../../lib/auth";
import { serializeInvoice, serializeSettings } from "../../../../../lib/invoice";
import { buildInvoicePdf } from "../../../../../lib/invoice-pdf";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    if (!/^\d{1,9}$/.test(id)) throw new HttpError(404, "Invoice tidak ditemukan");

    const [invoice, settings] = await Promise.all([
      prisma.invoice.findUnique({ where: { id: Number(id) }, include: { items: true } }),
      prisma.invoiceSetting.findUnique({ where: { id: 1 } }),
    ]);
    if (!invoice) throw new HttpError(404, "Invoice tidak ditemukan");
    if (!settings) throw new HttpError(422, "Pengaturan invoice belum diisi");

    const pdf = await buildInvoicePdf(serializeInvoice(invoice), serializeSettings(settings));
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${invoice.invoiceNumber}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    return handleError(err);
  }
}
