import { z } from "zod";
import { prisma } from "./prisma";
import { HttpError } from "./http";

// Batas kolom INT di database (sekitar 2,1 miliar rupiah).
const MAX_TOTAL = 2_000_000_000;

const text = (max: number) =>
  z.string().trim().min(1, "wajib diisi").max(max, `maksimal ${max} karakter`);

const realDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "format harus YYYY-MM-DD")
  .refine((v) => {
    const d = new Date(`${v}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
  }, "tanggal tidak valid");

export const invoiceInputSchema = z.object({
  clientName: text(150),
  clientAddress: text(500),
  clientEmail: z.string().trim().toLowerCase().email("format email tidak valid").max(190),
  items: z
    .array(
      z.object({
        serviceDescription: text(300),
        quantity: z.number().int("harus bilangan bulat").min(1, "minimal 1").max(100000),
        unitPrice: z
          .number()
          .int("harus bilangan bulat (rupiah)")
          .min(0, "tidak boleh negatif")
          .max(MAX_TOTAL),
      }),
    )
    .min(1, "minimal satu item")
    .max(50, "maksimal 50 item"),
  notes: z.string().trim().max(1000, "maksimal 1000 karakter").default(""),
  dueDate: realDate,
});
export type InvoiceInput = z.infer<typeof invoiceInputSchema>;

export const invoiceSettingsSchema = z.object({
  companyName: text(150),
  companyAddress: text(500),
  bankAccountName: text(150),
  bankAccountNumber: text(50),
  bankName: text(100),
  footerNote: z.string().trim().max(500, "maksimal 500 karakter").default(""),
});

type InvoiceRow = {
  id: number;
  invoiceNumber: string;
  clientName: string;
  clientAddress: string;
  clientEmail: string;
  notes: string | null;
  dueDate: Date;
  total: number;
  createdAt: Date;
  items: { serviceDescription: string; quantity: number; unitPrice: number }[];
};

export function serializeInvoice(inv: InvoiceRow) {
  return {
    id: String(inv.id),
    invoiceNumber: inv.invoiceNumber,
    clientName: inv.clientName,
    clientAddress: inv.clientAddress,
    clientEmail: inv.clientEmail,
    items: inv.items.map((i) => ({
      serviceDescription: i.serviceDescription,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
    })),
    total: inv.total,
    notes: inv.notes ?? "",
    dueDate: inv.dueDate.toISOString().slice(0, 10),
    createdAt: inv.createdAt.toISOString(),
  };
}

type SettingsRow = {
  companyName: string;
  companyAddress: string;
  bankAccountName: string;
  bankAccountNumber: string;
  bankName: string;
  footerNote: string | null;
  logoUrl: string | null;
};

export function serializeSettings(row: SettingsRow | null) {
  return {
    companyName: row?.companyName ?? "",
    companyAddress: row?.companyAddress ?? "",
    bankAccountName: row?.bankAccountName ?? "",
    bankAccountNumber: row?.bankAccountNumber ?? "",
    bankName: row?.bankName ?? "",
    footerNote: row?.footerNote ?? "",
    logoUrl: row?.logoUrl ?? null,
  };
}

function currentYearJakarta() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric" }).format(new Date());
}

export async function createInvoice(input: InvoiceInput) {
  const total = input.items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0);
  if (total > MAX_TOTAL) throw new HttpError(422, "Total invoice terlalu besar");

  const year = currentYearJakarta();
  const key = `invoice-${year}`;

  return prisma.$transaction(async (tx) => {
    // Update menahan kunci baris sampai transaksi selesai, jadi nomor tidak bisa kembar.
    await tx.counter.createMany({ data: [{ name: key, value: 0 }], skipDuplicates: true });
    const counter = await tx.counter.update({
      where: { name: key },
      data: { value: { increment: 1 } },
    });
    const invoiceNumber = `INV-${year}-${String(counter.value).padStart(4, "0")}`;

    return tx.invoice.create({
      data: {
        invoiceNumber,
        clientName: input.clientName,
        clientAddress: input.clientAddress,
        clientEmail: input.clientEmail,
        notes: input.notes || null,
        dueDate: new Date(`${input.dueDate}T00:00:00Z`),
        total,
        items: {
          create: input.items.map((i) => ({
            serviceDescription: i.serviceDescription,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
          })),
        },
      },
      include: { items: true },
    });
  });
}
