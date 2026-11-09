# Menjalankan backend DAPU di komputer sendiri

Panduan untuk tim FE. Hasil akhirnya: API di http://localhost:3000, database MariaDB lokal dengan data awal, satu akun admin lokal, dan kotak surat palsu (Mailpit) di http://localhost:8025.

## Yang dibutuhkan

- Git, Node.js 22 atau lebih baru, dan Docker Desktop (harus sudah berjalan).
- Akses ke repo ini (undangan collaborator dari pemilik repo).
- Port kosong: 3000 (API), 3307 (database), 1025 dan 8025 (Mailpit). FE biasanya memakai 3001.

## Langkah

### 1. Ambil kode dan pasang paket

```
git clone https://github.com/Nixzouxu/dapu-backend.git
cd dapu-backend
npm install
```

### 2. Siapkan .env

```
cp docs/env-lokal.example .env
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Salin hasil perintah kedua ke baris `SESSION_SECRET=` di file `.env`. File `.env` tidak masuk Git.

### 3. Nyalakan database dan Mailpit

```
docker compose up -d
docker compose ps
```

Tunggu sampai kolom status `db` menampilkan `healthy` (sekitar 15 detik).

### 4. Buat tabel dan isi data awal

```
npm run db:generate
npm run db:migrate
npm run db:seed
```

Hasil perintah terakhir: `Konten awal terisi: 6 portofolio, 1 jurnal, 5 artikel`.

### 5. Buat akun admin lokal

Tambahkan dua baris ini di akhir file `.env` (pilih sendiri kata sandinya, minimal 12 karakter):

```
ADMIN_EMAIL=admin@contoh.test
ADMIN_PASSWORD=isi-kata-sandi-sendiri
```

Lalu jalankan:

```
npm run admin:create
```

Hasilnya `Admin siap: admin@contoh.test`. Setelah itu hapus baris `ADMIN_PASSWORD` dari `.env`. Menjalankan perintah ini lagi memperbarui akun yang sama (berguna kalau lupa kata sandi lokal).

### 6. Jalankan API

```
npm run dev
```

### 7. Cek hasilnya

Di terminal lain (di Windows PowerShell pakai `curl.exe`, bukan `curl`):

```
curl http://localhost:3000/api/health
curl http://localhost:3000/api/portfolio
```

Yang diharapkan: `{"ok":true,"data":{"db":true}}`, lalu daftar enam item portofolio.

## Menyambungkan FE

- Atur `NEXT_PUBLIC_API_BASE_URL=http://localhost:3000` di FE, dan kirim semua request dengan `credentials: "include"`.
- Pakai nama host yang sama persis: FE di `http://localhost:3001` dan API di `http://localhost:3000`. Jangan dicampur dengan `127.0.0.1`, karena cookie sesi tidak terkirim antar situs yang berbeda.
- Origin FE yang diizinkan diatur di `CORS_ORIGINS` di `.env` (bawaan `http://localhost:3001`). Kalau FE memakai port lain, ubah nilainya lalu restart `npm run dev`.
- Login memakai akun admin dari langkah 5.
- Semua email (invoice dan notifikasi form) masuk ke Mailpit di http://localhost:8025 dan tidak dikirim keluar.

## Perilaku yang perlu diketahui

- Batas kiriman form publik (5 per 15 menit per alamat) dan batas percobaan login disimpan di memori. Restart `npm run dev` untuk mengosongkannya.
- Data uji tersimpan di volume Docker. Untuk mulai dari nol: `docker compose down -v`, lalu ulangi langkah 3 sampai 5.
- Semua kata sandi di panduan ini hanya untuk komputer lokal. Jangan dipakai di server sungguhan, dan jangan commit `.env`.

## Masalah umum

| Gejala | Penyebab dan jalan keluar |
|---|---|
| `P1001 Can't reach database server` | Docker belum berjalan atau kontainer `db` belum `healthy`. Cek `docker compose ps`. |
| `port is already allocated` | Port 3307, 1025, atau 8025 dipakai kontainer lain. Hentikan kontainer itu, atau ubah pemetaan port di `docker-compose.yml` beserta `DATABASE_PORT` atau `SMTP_PORT` di `.env`. |
| Login 401 padahal kata sandi benar | Akun admin belum dibuat, atau kata sandinya beda. Jalankan ulang `npm run admin:create`. |
| Login 429 | Terlalu banyak percobaan. Restart `npm run dev`. |
| Cookie tidak terkirim dari FE | Pastikan memakai `localhost` di kedua sisi, `credentials: "include"`, dan origin FE sama persis dengan `CORS_ORIGINS`. |
| Health menjawab 500 | Lihat terminal tempat `npm run dev` berjalan. Pesan aslinya tercetak di sana, bukan di respons. |

## Rujukan

Bentuk request dan respons tiap endpoint ada di dokumen kontrak FE-BE dan di pesan serah terima dari BE. Pesan error selalu `{ "ok": false, "error": "..." }`.