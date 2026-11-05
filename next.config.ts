import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Paket ini membaca file atau modul sistem saat dijalankan, jadi tidak digabung ke bundel.
  serverExternalPackages: ["pdfkit", "nodemailer"],
};

export default nextConfig;
