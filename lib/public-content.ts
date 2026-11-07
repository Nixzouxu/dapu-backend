type PortfolioRow = {
  id: number;
  title: string;
  category: string;
  year: number;
  description: string;
  imageUrl: string | null;
  url: string | null;
};

type JournalRow = {
  id: number;
  title: string;
  issn: string | null;
  publishedYear: number;
  description: string;
  url: string | null;
};

type ArticleRow = {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  readTime: number;
  author: string;
  publishedAt: Date;
  sections: string;
};

type Section = { heading: string; paragraphs: string[] };

// Bentuk keluaran mengikuti tipe di FE (lib/api.ts). Kolom opsional yang kosong dihilangkan.
export function serializePortfolio(r: PortfolioRow) {
  return {
    id: String(r.id),
    title: r.title,
    category: r.category === "proyekJasa" ? "proyek-jasa" : "terbitan",
    year: String(r.year),
    description: r.description,
    ...(r.imageUrl ? { imageUrl: r.imageUrl } : {}),
    ...(r.url ? { url: r.url } : {}),
  };
}

export function serializeJournal(r: JournalRow) {
  return {
    id: String(r.id),
    title: r.title,
    ...(r.issn ? { issn: r.issn } : {}),
    publishedYear: String(r.publishedYear),
    description: r.description,
    ...(r.url ? { url: r.url } : {}),
  };
}

function parseSections(raw: string): Section[] {
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value.filter(
      (s): s is Section =>
        typeof s === "object" &&
        s !== null &&
        typeof (s as Section).heading === "string" &&
        Array.isArray((s as Section).paragraphs) &&
        (s as Section).paragraphs.every((p) => typeof p === "string"),
    );
  } catch {
    return [];
  }
}

export function serializeArticle(r: ArticleRow) {
  return {
    id: String(r.id),
    slug: r.slug,
    title: r.title,
    excerpt: r.excerpt,
    category: r.category,
    readTime: r.readTime,
    author: r.author,
    publishedAt: r.publishedAt.toISOString().slice(0, 10),
    sections: parseSections(r.sections),
  };
}
