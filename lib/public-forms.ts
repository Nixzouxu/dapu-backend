import { z } from "zod";
import { prisma } from "./prisma";
import { HttpError } from "./http";
import { sendNotificationEmail } from "./mail";

const text = (max: number) =>
  z.string().trim().min(1, "wajib diisi").max(max, `maksimal ${max} karakter`);
const optional = (max: number) => z.string().trim().max(max, `maksimal ${max} karakter`).default("");

const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .email("format email tidak valid")
  .max(190, "maksimal 190 karakter");

const PHONE = /^[0-9+()\-\s]{6,25}$/;
const phoneRequired = z.string().trim().regex(PHONE, "format nomor telepon tidak valid");
const phoneOptional = z
  .string()
  .trim()
  .refine((v) => v === "" || PHONE.test(v), "format nomor telepon tidak valid")
  .default("");

function isRealDate(v: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

// Kolom "website" adalah kolom jebakan untuk bot. Manusia tidak melihatnya, jadi tidak pernah diisi.
export const contactSchema = z.object({
  name: text(120),
  email: emailField,
  phone: phoneOptional,
  subject: text(150),
  message: text(5000),
});

export const briefSchema = z.object({
  name: text(120),
  email: emailField,
  phone: phoneRequired,
  service: text(100),
  title: text(200),
  volume: optional(200),
  stage: optional(100),
  output: optional(100),
  deadline: z
    .string()
    .trim()
    .refine((v) => v === "" || isRealDate(v), "format harus YYYY-MM-DD atau kosong")
    .default(""),
  notes: optional(3000),
});

export type ContactInput = z.infer<typeof contactSchema>;
export type BriefInput = z.infer<typeof briefSchema>;

export function isHoneypotFilled(body: unknown) {
  if (typeof body !== "object" || body === null) return false;
  const v = (body as Record<string, unknown>).website;
  return typeof v === "string" && v.trim() !== "";
}

// Pembatas kiriman form publik. Disimpan di memori proses, jadi reset saat aplikasi restart.
const hits = new Map<string, { count: number; resetAt: number }>();

function hit(key: string, max: number, windowMs: number): number {
  const now = Date.now();
  if (hits.size > 2000) {
    for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
  }
  const cur = hits.get(key);
  if (!cur || cur.resetAt <= now) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return 0;
  }
  if (cur.count >= max) return Math.ceil((cur.resetAt - now) / 1000);
  cur.count += 1;
  return 0;
}

function clientIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "tidak-diketahui";
}

// Mengembalikan sisa detik pemblokiran, atau 0 kalau boleh lanjut.
// Batas per alamat 5 kiriman per 15 menit, dan batas total 60 kiriman per jam.
export function guardSubmission(request: Request): number {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > 50_000) throw new HttpError(413, "Data terlalu besar");
  const waitIp = hit(`form-ip:${clientIp(request)}`, 5, 15 * 60_000);
  const waitAll = hit("form-all", 60, 60 * 60_000);
  return Math.max(waitIp, waitAll);
}

function currentYearJakarta() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric" }).format(new Date());
}

export async function createBrief(input: BriefInput) {
  const year = currentYearJakarta();
  const key = `brief-${year}`;
  return prisma.$transaction(async (tx) => {
    await tx.counter.createMany({ data: [{ name: key, value: 0 }], skipDuplicates: true });
    const counter = await tx.counter.update({
      where: { name: key },
      data: { value: { increment: 1 } },
    });
    const reference = `BRF-${year}-${String(counter.value).padStart(4, "0")}`;
    return tx.consultationBrief.create({
      data: {
        reference,
        name: input.name,
        email: input.email,
        phone: input.phone,
        service: input.service,
        title: input.title,
        volume: input.volume,
        stage: input.stage,
        output: input.output,
        deadline: input.deadline ? new Date(`${input.deadline}T00:00:00Z`) : null,
        notes: input.notes || null,
      },
    });
  });
}

export async function createContact(input: ContactInput) {
  return prisma.contactMessage.create({
    data: {
      name: input.name,
      email: input.email,
      phone: input.phone || null,
      subject: input.subject,
      message: input.message,
    },
  });
}

const oneLine = (s: string, max = 80) => s.replace(/\s+/g, " ").trim().slice(0, max);

// Dipanggil tanpa menunggu hasilnya. Kegagalan email hanya dicatat di log.
export async function notifyNewBrief(reference: string, input: BriefInput) {
  await sendNotificationEmail({
    subject: `Brief baru ${reference} dari ${oneLine(input.name, 60)}`,
    replyTo: input.email,
    text: [
      `Brief konsultasi baru ${reference}`,
      "",
      `Nama: ${input.name}`,
      `Email: ${input.email}`,
      `Telepon: ${input.phone}`,
      `Layanan: ${input.service}`,
      `Judul naskah: ${input.title}`,
      `Volume: ${input.volume || "-"}`,
      `Tahap: ${input.stage || "-"}`,
      `Output: ${input.output || "-"}`,
      `Tenggat: ${input.deadline || "-"}`,
      "",
      "Catatan:",
      input.notes || "-",
    ].join("\n"),
  });
}

export async function notifyNewContact(input: ContactInput) {
  await sendNotificationEmail({
    subject: `Pesan kontak: ${oneLine(input.subject, 80)}`,
    replyTo: input.email,
    text: [
      "Pesan baru dari formulir kontak",
      "",
      `Nama: ${input.name}`,
      `Email: ${input.email}`,
      `Telepon: ${input.phone || "-"}`,
      `Subjek: ${input.subject}`,
      "",
      "Pesan:",
      input.message,
    ].join("\n"),
  });
}
