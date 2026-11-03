import { prisma } from "../../../../lib/prisma";
import { ok, handleError, HttpError } from "../../../../lib/http";
import { requireAdmin } from "../../../../lib/auth";
import { LOGO_MAX_BYTES, logoUrlFor, validateLogo } from "../../../../lib/logo";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Unggah atau ganti logo (khusus admin). Form multipart dengan field "logo".
export async function POST(request: Request) {
  try {
    await requireAdmin();

    const declared = Number(request.headers.get("content-length") ?? 0);
    if (declared > LOGO_MAX_BYTES + 100_000) throw new HttpError(413, "Ukuran logo maksimal 1 MB");

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      throw new HttpError(400, "Permintaan harus berupa multipart/form-data");
    }

    const file = form.get("logo");
    if (!(file instanceof File)) throw new HttpError(422, "Field logo wajib berisi file");
    if (file.size === 0) throw new HttpError(422, "File logo kosong");
    if (file.size > LOGO_MAX_BYTES) throw new HttpError(422, "Ukuran logo maksimal 1 MB");

    const buf = Buffer.from(await file.arrayBuffer());
    const info = validateLogo(buf);
    const data = new Uint8Array(buf);

    const row = await prisma.invoiceLogo.upsert({
      where: { id: 1 },
      update: { mimeType: info.mime, data, size: buf.length },
      create: { id: 1, mimeType: info.mime, data, size: buf.length },
    });
    return ok({ logoUrl: logoUrlFor(row.updatedAt, request) });
  } catch (err) {
    return handleError(err);
  }
}

// Logo dibuka tanpa login: tag gambar lintas origin tidak membawa cookie.
export async function GET() {
  try {
    const row = await prisma.invoiceLogo.findUnique({ where: { id: 1 } });
    if (!row) throw new HttpError(404, "Logo belum diunggah");
    return new Response(new Uint8Array(row.data), {
      headers: {
        "Content-Type": row.mimeType,
        "Content-Length": String(row.size),
        "Cache-Control": "public, max-age=300",
        "X-Content-Type-Options": "nosniff",
        "Cross-Origin-Resource-Policy": "cross-origin",
      },
    });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE() {
  try {
    await requireAdmin();
    await prisma.invoiceLogo.deleteMany({ where: { id: 1 } });
    return ok({ logoUrl: null });
  } catch (err) {
    return handleError(err);
  }
}
