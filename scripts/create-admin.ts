import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";

// Membuat atau memperbarui akun admin. Data diambil dari variabel lingkungan,
// jadi kata sandi tidak pernah tersimpan di file kode.
async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME?.trim() || "Admin DAPU";

  if (!email || !password) throw new Error("ADMIN_EMAIL dan ADMIN_PASSWORD wajib diisi");
  if (password.length < 12) throw new Error("Kata sandi minimal 12 karakter");

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.admin.upsert({
    where: { email },
    update: { passwordHash, name },
    create: { email, passwordHash, name },
  });
  console.log("Admin siap:", email);
}

main()
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
