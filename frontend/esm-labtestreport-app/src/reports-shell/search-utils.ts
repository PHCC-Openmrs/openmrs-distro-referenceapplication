/**
 * Multi-word search for the report tables: the typed text is split on whitespace and every word
 * must appear somewhere in the row's searchable text (in any order, across any of the fields).
 * Matching the whole phrase against one field at a time would make "amal hasan" or "o o o" find
 * nothing, because first/middle/family names are stored as separate fields.
 */
export function matchesSearchTerm(
  searchableValues: Array<string | null | undefined>,
  searchTerm: string,
): boolean {
  const words = searchTerm.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return true;
  }
  const haystack = searchableValues
    .filter(
      (value): value is string => typeof value === "string" && value.length > 0,
    )
    .join(" ")
    .toLowerCase();
  return words.every((word) => haystack.includes(word));
}
