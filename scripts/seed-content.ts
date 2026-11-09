import "dotenv/config";
import { readFileSync } from "node:fs";
import { prisma } from "../lib/prisma";

// Mengisi konten awal (portofolio, jurnal, artikel) dari berkas JSON yang diekspor dari data bawaan FE.
type P = { id: string; title: string; category: string; year: string; description: string; imageUrl?: string; url?: string };
type J = { id: string; title: string; issn?: string; publishedYear: string; description: string; url?: string };
type A = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  readTime: number;
  author: string;
  publishedAt: string;
  sections: unknown[];
};

const toId = (value: string, index: number) => (/^\d+$/.test(value) ? Number(value) : index + 1);
const toYear = (value: string) => {
  const n = Number.parseInt(value, 10);
  if (Number.isNaN(n)) throw new Error(`Tahun tidak valid: ${value}`);
  return n;
};

async function main() {
  const file = process.env.SEED_FILE ?? "prisma/seed-content.json";
  if (!file) throw new Error("SEED_FILE wajib diisi");
  const seed = JSON.parse(readFileSync(file, "utf8")) as { portfolio: P[]; journals: J[]; articles: A[] };

  for (const [i, p] of seed.portfolio.entries()) {
    const id = toId(p.id, i);
    const data = {
      title: p.title,
      category: p.category === "proyek-jasa" ? ("proyekJasa" as const) : ("terbitan" as const),
      year: toYear(p.year),
      description: p.description,
      imageUrl: p.imageUrl ?? null,
      url: p.url ?? null,
    };
    await prisma.portfolioItem.upsert({ where: { id }, update: data, create: { id, ...data } });
  }

  for (const [i, j] of seed.journals.entries()) {
    const id = toId(j.id, i);
    const data = {
      title: j.title,
      issn: j.issn ?? null,
      publishedYear: toYear(j.publishedYear),
      description: j.description,
      url: j.url ?? null,
    };
    await prisma.journal.upsert({ where: { id }, update: data, create: { id, ...data } });
  }

  for (const [i, a] of seed.articles.entries()) {
    const id = toId(a.id, i);
    const data = {
      slug: a.slug,
      title: a.title,
      excerpt: a.excerpt,
      category: a.category,
      readTime: a.readTime,
      author: a.author,
      publishedAt: new Date(`${a.publishedAt}T00:00:00Z`),
      sections: JSON.stringify(a.sections),
    };
    await prisma.article.upsert({ where: { id }, update: data, create: { id, ...data } });
  }

  console.log("Konten awal terisi:", seed.portfolio.length, "portofolio,", seed.journals.length, "jurnal,", seed.articles.length, "artikel");
}

main()
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
