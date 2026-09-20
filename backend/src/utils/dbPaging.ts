/**
 * Helpers for reading complete result sets from Supabase/PostgREST.
 *
 * PostgREST silently caps a single response at `max_rows` (default 1000). A plain
 * `.select('*')` on a table that has grown past that returns the first 1000 rows and NO
 * error, so screens quietly show incomplete data. These helpers page with `.range()` until
 * the table is exhausted.
 *
 * IMPORTANT: paging needs a deterministic order. Always `.order()` by a unique column
 * (or a non-unique column plus `id`) inside `build`, otherwise rows can repeat or be skipped
 * between pages.
 *
 * If `max_rows` is lowered below 1000 in the Supabase API settings, set DB_PAGE_SIZE to the
 * same value (a page shorter than the page size is treated as the last page).
 */

type PageResult<T> = { data: T[] | null; error: { message?: string } | null };

const envPage = Number(process.env.DB_PAGE_SIZE);
export const DEFAULT_PAGE_SIZE = Number.isFinite(envPage) && envPage > 0 ? Math.floor(envPage) : 1000;

/** Fetches every row of a query by paging. Throws if any page errors. */
export async function fetchAllRows<T = any>(
  build: (from: number, to: number) => PromiseLike<PageResult<T>>,
  pageSize: number = DEFAULT_PAGE_SIZE
): Promise<T[]> {
  const all: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await build(from, from + pageSize - 1);
    if (error) throw error;
    const rows = data || [];
    all.push(...rows);
    if (rows.length < pageSize) break;
  }
  return all;
}

/**
 * Like fetchAllRows, for queries filtered with `.in(column, ids)`. The ids are split into
 * chunks so the request URL stays short (hundreds of ids in one `in.(...)` can exceed the
 * gateway's URL limit), and each chunk is paged. Duplicate/empty ids are dropped.
 */
export async function fetchAllByIn<T = any>(
  ids: readonly (string | null | undefined)[],
  build: (chunk: string[], from: number, to: number) => PromiseLike<PageResult<T>>,
  chunkSize = 100,
  pageSize: number = DEFAULT_PAGE_SIZE
): Promise<T[]> {
  const unique = Array.from(new Set(ids.filter((v): v is string => Boolean(v))));
  const out: T[] = [];
  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize);
    out.push(...(await fetchAllRows<T>((from, to) => build(chunk, from, to), pageSize)));
  }
  return out;
}
