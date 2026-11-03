import { prisma } from "./prisma";
import { HttpError } from "./http";

export const LOGO_MAX_BYTES = 1_000_000;
const MAX_SIDE = 2000;

export type ImageInfo = {
  mime: "image/png" | "image/jpeg";
  width: number;
  height: number;
  interlaced: boolean;
};

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

// Membaca jenis dan ukuran gambar dari isi file, bukan dari nama atau tipe yang dikirim klien.
export function readImageInfo(buf: Buffer): ImageInfo | null {
  if (buf.length > 29 && buf.subarray(0, 8).equals(PNG_SIGNATURE)) {
    if (buf.toString("ascii", 12, 16) !== "IHDR") return null;
    return {
      mime: "image/png",
      width: buf.readUInt32BE(16),
      height: buf.readUInt32BE(20),
      interlaced: buf[28] === 1,
    };
  }

  if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) {
        i++;
        continue;
      }
      const marker = buf[i + 1];
      if (marker === 0xff) {
        i++;
        continue;
      }
      if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
        i += 2;
        continue;
      }
      const len = buf.readUInt16BE(i + 2);
      const isFrame = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
      if (isFrame) {
        return {
          mime: "image/jpeg",
          height: buf.readUInt16BE(i + 5),
          width: buf.readUInt16BE(i + 7),
          interlaced: false,
        };
      }
      i += 2 + len;
    }
  }
  return null;
}

export function validateLogo(buf: Buffer): ImageInfo {
  const info = readImageInfo(buf);
  if (!info) throw new HttpError(422, "Logo harus berupa PNG atau JPEG yang valid");
  if (!info.width || !info.height || info.width > MAX_SIDE || info.height > MAX_SIDE) {
    throw new HttpError(422, `Dimensi logo maksimal ${MAX_SIDE} x ${MAX_SIDE} piksel`);
  }
  if (info.interlaced) {
    throw new HttpError(422, "PNG interlaced tidak didukung, simpan ulang tanpa interlace");
  }
  return info;
}

// Alamat publik logo. Parameter v berubah tiap logo diganti agar cache browser tidak usang.
export function logoUrlFor(updatedAt: Date, request?: Request) {
  const fallback = request ? new URL(request.url).origin : "";
  const base = (process.env.PUBLIC_API_URL || fallback).replace(/\/$/, "");
  return `${base}/api/invoice-settings/logo?v=${updatedAt.getTime()}`;
}

export async function currentLogoUrl(request?: Request) {
  const meta = await prisma.invoiceLogo.findUnique({ where: { id: 1 }, select: { updatedAt: true } });
  return meta ? logoUrlFor(meta.updatedAt, request) : null;
}
