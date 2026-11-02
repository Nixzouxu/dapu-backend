import { prisma } from "../../../lib/prisma";
import { ok, handleError, readJson } from "../../../lib/http";
import { requireAdmin } from "../../../lib/auth";
import { invoiceSettingsSchema, serializeSettings } from "../../../lib/invoice";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
    const row = await prisma.invoiceSetting.findUnique({ where: { id: 1 } });
    return ok(serializeSettings(row));
  } catch (err) {
    return handleError(err);
  }
}

// logoUrl sengaja diabaikan di sini; unggah logo dibuat terpisah.
export async function PUT(request: Request) {
  try {
    await requireAdmin();
    const input = invoiceSettingsSchema.parse(await readJson(request));
    const row = await prisma.invoiceSetting.upsert({
      where: { id: 1 },
      update: input,
      create: { id: 1, ...input },
    });
    return ok(serializeSettings(row));
  } catch (err) {
    return handleError(err);
  }
}
