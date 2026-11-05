import { prisma } from "../../../../../lib/prisma";
import { ok, handleError, HttpError } from "../../../../../lib/http";
import { requireAdmin } from "../../../../../lib/auth";
import { serializeInvoice, serializeSettings } from "../../../../../lib/invoice";
import { buildInvoicePdf } from "../../../../../lib/invoice-pdf";
import { sendInvoiceEmail } from "../../../../../lib/mail";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    if (!/^\d{1,9}$/.test(id)) throw new HttpError(404, "Invoice tidak ditemukan");

    const [row, settingsRow, logo] = await Promise.all([
      prisma.invoice.findUnique({ where: { id: Number(id) }, include: { items: true } }),
      prisma.invoiceSetting.findUnique({ where: { id: 1 } }),
      prisma.invoiceLogo.findUnique({ where: { id: 1 } }),
    ]);
    if (!row) throw new HttpError(404, "Invoice tidak ditemukan");
    if (!settingsRow) throw new HttpError(422, "Pengaturan invoice belum diisi");

    const invoice = serializeInvoice(row);
    const settings = serializeSettings(settingsRow);
    const pdf = await buildInvoicePdf(invoice, settings, logo ? Buffer.from(logo.data) : null);

    await sendInvoiceEmail(invoice, settings, pdf);
    return ok({ sent: true, to: invoice.clientEmail });
  } catch (err) {
    return handleError(err);
  }
}
