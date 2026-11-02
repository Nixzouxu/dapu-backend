// Pembatas percobaan login. Disimpan di memori proses, jadi reset saat aplikasi restart.
const WINDOW_MS = 15 * 60 * 1000;

type Entry = { count: number; resetAt: number };
const store = new Map<string, Entry>();

function prune(now: number) {
  if (store.size < 1000) return;
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) store.delete(key);
  }
}

// Mengembalikan sisa detik pemblokiran, atau 0 kalau masih boleh mencoba.
export function checkBlocked(key: string, max: number): number {
  const now = Date.now();
  const entry = store.get(key);
  if (!entry) return 0;
  if (entry.resetAt <= now) {
    store.delete(key);
    return 0;
  }
  return entry.count >= max ? Math.ceil((entry.resetAt - now) / 1000) : 0;
}

export function recordFailure(key: string) {
  const now = Date.now();
  prune(now);
  const entry = store.get(key);
  if (!entry || entry.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + WINDOW_MS });
  } else {
    entry.count += 1;
  }
}

export function clearFailures(key: string) {
  store.delete(key);
}
