import PDFDocument from "pdfkit";

type PdfInvoice = {
  invoiceNumber: string;
  clientName: string;
  clientAddress: string;
  clientEmail: string;
  items: { serviceDescription: string; quantity: number; unitPrice: number }[];
  total: number;
  notes: string;
  dueDate: string;
  createdAt: string;
};

type PdfSettings = {
  companyName: string;
  companyAddress: string;
  bankAccountName: string;
  bankAccountNumber: string;
  bankName: string;
  footerNote: string;
};

const rupiah = (n: number) => "Rp " + new Intl.NumberFormat("id-ID").format(n);

const fmtDate = (value: string, timeZone: string) =>
  new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone }).format(
    new Date(value.length === 10 ? `${value}T00:00:00Z` : value),
  );

// Membuat PDF invoice A4 dan mengembalikannya sebagai Buffer.
export function buildInvoicePdf(inv: PdfInvoice, s: PdfSettings): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: 50,
      info: { Title: `Invoice ${inv.invoiceNumber}`, Author: s.companyName },
    });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const left = 50;
    const right = 545;
    const bottom = 780;
    const ink = "#111827";
    const muted = "#6b7280";
    let y = 50;

    const ensure = (height: number) => {
      if (y + height > bottom) {
        doc.addPage();
        y = 50;
      }
    };

    // Kop: perusahaan di kiri, judul dan nomor di kanan.
    doc.font("Helvetica-Bold").fontSize(16).fillColor(ink).text(s.companyName, left, y, { width: 290 });
    doc.font("Helvetica").fontSize(9).fillColor(muted).text(s.companyAddress, left, doc.y + 2, { width: 290 });
    const leftBottom = doc.y;

    doc.font("Helvetica-Bold").fontSize(22).fillColor(ink).text("INVOICE", 350, y, { width: 195, align: "right" });
    doc.font("Helvetica").fontSize(9).fillColor(muted);
    doc.text(inv.invoiceNumber, 350, doc.y + 2, { width: 195, align: "right" });
    doc.text(`Tanggal: ${fmtDate(inv.createdAt, "Asia/Jakarta")}`, 350, doc.y + 2, { width: 195, align: "right" });
    doc.text(`Jatuh tempo: ${fmtDate(inv.dueDate, "UTC")}`, 350, doc.y + 2, { width: 195, align: "right" });
    y = Math.max(leftBottom, doc.y) + 18;

    doc.moveTo(left, y).lineTo(right, y).lineWidth(0.5).strokeColor("#d1d5db").stroke();
    y += 14;

    // Penerima tagihan.
    doc.font("Helvetica").fontSize(8).fillColor(muted).text("DITAGIHKAN KEPADA", left, y);
    doc.font("Helvetica-Bold").fontSize(11).fillColor(ink).text(inv.clientName, left, doc.y + 3, { width: 300 });
    doc.font("Helvetica").fontSize(9).fillColor(muted).text(inv.clientAddress, left, doc.y + 2, { width: 300 });
    doc.text(inv.clientEmail, left, doc.y + 2, { width: 300 });
    y = doc.y + 20;

    // Tabel item.
    const col = {
      no: { x: 50, w: 25 },
      desc: { x: 80, w: 225 },
      qty: { x: 310, w: 40 },
      price: { x: 355, w: 90 },
      sum: { x: 450, w: 95 },
    };

    const drawTableHeader = () => {
      doc.rect(left, y, right - left, 20).fill("#f3f4f6");
      doc.font("Helvetica-Bold").fontSize(9).fillColor(ink);
      doc.text("No", col.no.x + 4, y + 6, { width: col.no.w });
      doc.text("Deskripsi", col.desc.x, y + 6, { width: col.desc.w });
      doc.text("Jml", col.qty.x, y + 6, { width: col.qty.w, align: "right" });
      doc.text("Harga satuan", col.price.x, y + 6, { width: col.price.w, align: "right" });
      doc.text("Jumlah", col.sum.x, y + 6, { width: col.sum.w - 4, align: "right" });
      y += 20;
    };

    drawTableHeader();
    inv.items.forEach((item, index) => {
      doc.font("Helvetica").fontSize(9);
      const descHeight = doc.heightOfString(item.serviceDescription, { width: col.desc.w });
      const rowHeight = Math.max(descHeight, 11) + 12;
      if (y + rowHeight > bottom - 40) {
        doc.addPage();
        y = 50;
        drawTableHeader();
      }
      doc.fillColor(ink);
      doc.text(String(index + 1), col.no.x + 4, y + 6, { width: col.no.w });
      doc.text(item.serviceDescription, col.desc.x, y + 6, { width: col.desc.w });
      doc.text(new Intl.NumberFormat("id-ID").format(item.quantity), col.qty.x, y + 6, { width: col.qty.w, align: "right" });
      doc.text(rupiah(item.unitPrice), col.price.x, y + 6, { width: col.price.w, align: "right" });
      doc.text(rupiah(item.quantity * item.unitPrice), col.sum.x, y + 6, { width: col.sum.w - 4, align: "right" });
      y += rowHeight;
      doc.moveTo(left, y).lineTo(right, y).lineWidth(0.5).strokeColor("#e5e7eb").stroke();
    });

    // Total.
    ensure(50);
    y += 12;
    doc.font("Helvetica-Bold").fontSize(11).fillColor(ink);
    doc.text("Total", 310, y, { width: 135, align: "right" });
    doc.text(rupiah(inv.total), col.sum.x, y, { width: col.sum.w - 4, align: "right" });
    y += 34;

    // Informasi pembayaran.
    ensure(80);
    doc.font("Helvetica").fontSize(8).fillColor(muted).text("PEMBAYARAN", left, y);
    doc.font("Helvetica").fontSize(9).fillColor(ink);
    doc.text(s.bankName, left, doc.y + 3, { width: 300 });
    doc.text(`a.n. ${s.bankAccountName}`, left, doc.y + 2, { width: 300 });
    doc.font("Helvetica-Bold").text(s.bankAccountNumber, left, doc.y + 2, { width: 300 });
    y = doc.y + 18;

    if (inv.notes) {
      ensure(50);
      doc.font("Helvetica").fontSize(8).fillColor(muted).text("CATATAN", left, y);
      doc.font("Helvetica").fontSize(9).fillColor(ink).text(inv.notes, left, doc.y + 3, { width: right - left });
      y = doc.y + 18;
    }

    if (s.footerNote) {
      ensure(30);
      doc.font("Helvetica-Oblique").fontSize(9).fillColor(muted).text(s.footerNote, left, y, { width: right - left });
    }

    doc.end();
  });
}
