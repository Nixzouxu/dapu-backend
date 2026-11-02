import { prisma } from "../../../lib/prisma";
import { ok, handleError, readJson } from "../../../lib/http";
import { requireAdmin } from "../../../lib/auth";
import { createInvoice, invoiceInputSchema, serializeInvoice } from "../../../lib/invoice";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const input = invoiceInputSchema.parse(await readJson(request));
    const invoice = await createInvoice(input);
    return ok(serializeInvoice(invoice), 201);
  } catch (err) {
    return handleError(err);
  }
}

export async function GET() {
  try {
    await requireAdmin();
    const rows = await prisma.invoice.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      include: { items: true },
      take: 500,
    });
    return ok(rows.map(serializeInvoice));
  } catch (err) {
    return handleError(err);
  }
}
