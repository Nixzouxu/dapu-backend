import { prisma } from "../../../lib/prisma";
import { ok, handleError, readJson } from "../../../lib/http";
import { requireAdmin } from "../../../lib/auth";
import { invoiceSettingsSchema, serializeSettings } from "../../../lib/invoice";
import { currentLogoUrl } from "../../../lib/logo";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const row = await prisma.invoiceSetting.findUnique({ where: { id: 1 } });
    return ok({ ...serializeSettings(row), logoUrl: await currentLogoUrl(request) });
  } catch (err) {
    return handleError(err);
  }
}

// logoUrl diabaikan di sini; logo diubah lewat /api/invoice-settings/logo.
export async function PUT(request: Request) {
  try {
    await requireAdmin();
    const input = invoiceSettingsSchema.parse(await readJson(request));
    const row = await prisma.invoiceSetting.upsert({
      where: { id: 1 },
      update: input,
      create: { id: 1, ...input },
    });
    return ok({ ...serializeSettings(row), logoUrl: await currentLogoUrl(request) });
  } catch (err) {
    return handleError(err);
  }
}
