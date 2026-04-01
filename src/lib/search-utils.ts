/**
 * Tokenize a search query into clean alphanumeric terms.
 * Pure function — no DB dependency. Used by FTS and tests.
 */
export function tokenizeSearchQuery(query: string): string[] {
  return query
    .trim()
    .split(/\s+/)
    .filter((t) => t.length > 0)
    .map((t) => {
      const escaped = t.replace(/[^a-zA-Z0-9]/g, "");
      if (escaped.length === 0) return null;
      return `"${escaped}"*`;
    })
    .filter((t): t is string => t !== null);
}
