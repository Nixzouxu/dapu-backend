import nodemailer from "nodemailer";
import { HttpError } from "./http";

type MailInvoice = {
  invoiceNumber: string;
  clientName: string;
  clientEmail: string;
  total: number;
  dueDate: string;
};

type MailSettings = {
  companyName: string;
  bankName: string;
  bankAccountName: string;
  bankAccountNumber: string;
  footerNote: string;
};

const rupiah = (n: number) => "Rp " + new Intl.NumberFormat("id-ID").format(n);

const fmtDate = (value: string) =>
  new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${value}T00:00:00Z`),
  );

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function mailConfig() {
  const host = process.env.SMTP_HOST;
  const from = process.env.MAIL_FROM;
  if (!host || !from) throw new HttpError(503, "Pengiriman email belum dikonfigurasi");
  return {
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
    from,
    replyTo: process.env.MAIL_REPLY_TO || undefined,
    bcc: process.env.MAIL_BCC || undefined,
  };
}

// Mengirim invoice beserta PDF-nya ke email klien.
export async function sendInvoiceEmail(inv: MailInvoice, s: MailSettings, pdf: Buffer) {
  const cfg = mailConfig();
  const transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: cfg.user && cfg.pass ? { user: cfg.user, pass: cfg.pass } : undefined,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 30_000,
  });

  const subject = `Invoice ${inv.invoiceNumber} dari ${s.companyName}`.replace(/[\r\n]+/g, " ");
  const lines = [
    `Yth. ${inv.clientName},`,
    "",
    `Terlampir invoice ${inv.invoiceNumber} sebesar ${rupiah(inv.total)} dengan jatuh tempo ${fmtDate(inv.dueDate)}.`,
    "",
    "Pembayaran dapat dilakukan ke:",
    `${s.bankName}, a.n. ${s.bankAccountName}`,
    s.bankAccountNumber,
    "",
    ...(s.footerNote ? [s.footerNote, ""] : []),
    "Hormat kami,",
    s.companyName,
  ];
  const text = lines.join("\n");
  const html = lines.map((l) => (l ? `<p style="margin:0 0 6px">${esc(l)}</p>` : "<br>")).join("");

  try {
    await transporter.sendMail({
      from: cfg.from,
      to: inv.clientEmail,
      replyTo: cfg.replyTo,
      bcc: cfg.bcc,
      subject,
      text,
      html,
      attachments: [{ filename: `${inv.invoiceNumber}.pdf`, content: pdf, contentType: "application/pdf" }],
    });
  } catch (err) {
    const e = err as { code?: string; responseCode?: number; message?: string };
    console.error("Gagal mengirim email invoice:", e.code, e.responseCode, e.message);
    throw new HttpError(502, "Email gagal dikirim, coba lagi nanti");
  } finally {
    transporter.close();
  }
}
