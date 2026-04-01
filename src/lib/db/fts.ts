import { db } from "./index";
import { sql } from "drizzle-orm";

interface FtsResult {
  id: string;
  rank: number;
}

// Re-export tokenizeSearchQuery from search-utils (pure function, no DB dep)
export { tokenizeSearchQuery } from "@/lib/search-utils";

/**
 * Search listings using PostgreSQL full-text search.
 *
 * Uses tsvector/tsquery with weighted columns:
 *   title (weight A), location (weight B), description (weight C)
 *
 * Falls back to ILIKE if tsquery returns nothing (handles partial/prefix matches).
 */
export async function searchListingsFts(
  query: string
): Promise<{ ids: string[]; scoreMap: Map<string, number> }> {
  const cleaned = query.replace(/[^a-zA-Z0-9\s]/g, "").trim();
  if (!cleaned) return { ids: [], scoreMap: new Map() };

  const terms = cleaned.split(/\s+/).filter((t) => t.length > 0);
  if (terms.length === 0) return { ids: [], scoreMap: new Map() };

  // Try tsquery with AND first (all terms must match)
  const andTsquery = terms.map((t) => `${t}:*`).join(" & ");
  let rows = await tryTsQuery(andTsquery);

  // Fall back to OR if AND returned nothing
  if (rows.length === 0 && terms.length > 1) {
    const orTsquery = terms.map((t) => `${t}:*`).join(" | ");
    rows = await tryTsQuery(orTsquery);
  }

  // Fall back to ILIKE if tsquery returned nothing (handles edge cases)
  if (rows.length === 0) {
    const likePattern = `%${cleaned}%`;
    const likeRows = await db.execute(sql`
      SELECT id, 1.0 as rank FROM listings
      WHERE title ILIKE ${likePattern}
         OR description ILIKE ${likePattern}
         OR location ILIKE ${likePattern}
      LIMIT 50
    `) as unknown as FtsResult[];

    rows = Array.isArray(likeRows) ? likeRows : [];
  }

  const scoreMap = new Map<string, number>();
  for (const r of rows) {
    scoreMap.set(r.id, r.rank);
  }

  return { ids: rows.map((r) => r.id), scoreMap };
}

async function tryTsQuery(tsquery: string): Promise<FtsResult[]> {
  try {
    const rows = await db.execute(sql`
      SELECT id, ts_rank_cd(
        setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(location, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(description, '')), 'C'),
        to_tsquery('english', ${tsquery})
      ) as rank
      FROM listings
      WHERE
        setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(location, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(description, '')), 'C')
        @@ to_tsquery('english', ${tsquery})
      ORDER BY rank DESC
      LIMIT 50
    `) as unknown as FtsResult[];

    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}
