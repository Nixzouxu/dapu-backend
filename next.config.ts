import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdfkit membaca file font dari node_modules saat dijalankan, jadi tidak boleh digabung ke bundel.
  serverExternalPackages: ["pdfkit"],
};

export default nextConfig;
