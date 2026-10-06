import { type StockItemDTO } from '../api/types/stockItem/StockItem';

/**
 * Relevance ranking for stock item search results.
 *
 * The backend resolves the `q` parameter through OpenMRS' concept/drug full-text search plus a
 * Hibernate Search pass over `commonName`/`acronym`, all of which match fuzzily on purpose (so a
 * typed "Vaslsartan" still finds "VALSARTAN"). `StockManagementDao.findStockItems` then reads the
 * matched rows back with `order by si.id asc`, which throws that relevance away: the item the user
 * actually typed can land anywhere in the result set - below unrelated fuzzy hits, or past the end
 * of a limited/paged response entirely. These helpers re-score the returned rows against the query
 * client-side so the closest name match comes first.
 */

/** Fields that actually carry a name the user could have typed, in display-priority order. */
const PRIMARY_FIELDS: Array<keyof StockItemDTO> = ['drugName', 'commonName'];
const SECONDARY_FIELDS: Array<keyof StockItemDTO> = ['conceptName', 'acronym'];

/** A secondary-field match is worth slightly less, so a generic-name hit wins an otherwise-tie. */
const SECONDARY_FIELD_WEIGHT = 0.9;

/**
 * Below this, a row is treated as fuzzy noise the user did not ask for - but only ever dropped when
 * something better was also returned (see {@link rankStockItemsByRelevance}).
 */
const RELEVANT_SCORE_THRESHOLD = 10;

/** Lowercase and reduce punctuation to word breaks, so "160/12.5 MG" tokenizes as 160 / 12 / 5 / mg. */
function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Levenshtein distance, abandoned as soon as it is known to exceed `max` - only ever used to decide
 * "is this the same word misspelled", never to produce a meaningful distance beyond the cut-off.
 */
function boundedEditDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;

  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    let rowMinimum = i;
    for (let j = 1; j <= b.length; j++) {
      const substitution = previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1);
      const distance = Math.min(substitution, previous[j] + 1, current[j - 1] + 1);
      current.push(distance);
      rowMinimum = Math.min(rowMinimum, distance);
    }
    if (rowMinimum > max) return max + 1;
    previous = current;
  }
  return previous[b.length];
}

/** How many typos to forgive in a token - short tokens ("160", "mg") must match exactly. */
function allowedEdits(token: string): number {
  if (token.length >= 8) return 2;
  if (token.length >= 5) return 1;
  return 0;
}

/** Best match for one query token against the words of one field, scored 0 (no match) to 1 (exact). */
function scoreToken(token: string, words: string[]): number {
  let best = 0;
  for (const word of words) {
    if (word === token) return 1;
    if (word.startsWith(token)) {
      best = Math.max(best, 0.9);
      continue;
    }
    if (word.length >= 3 && token.startsWith(word)) {
      best = Math.max(best, 0.6);
      continue;
    }
    if (token.length >= 3 && word.includes(token)) {
      best = Math.max(best, 0.5);
      continue;
    }
    const maxEdits = allowedEdits(token);
    if (maxEdits > 0 && boundedEditDistance(token, word, maxEdits) <= maxEdits) {
      best = Math.max(best, 0.65);
    }
  }
  return best;
}

function scoreField(value: string, normalizedQuery: string, queryTokens: string[]): number {
  const normalizedValue = normalize(value);
  if (normalizedValue.length === 0) return 0;

  if (normalizedValue === normalizedQuery) return 100;
  if (normalizedValue.startsWith(`${normalizedQuery} `)) return 85;
  if (normalizedValue.includes(normalizedQuery)) return 70;

  const words = normalizedValue.split(' ');
  let matchedTokens = 0;
  let totalTokenScore = 0;
  for (const token of queryTokens) {
    const tokenScore = scoreToken(token, words);
    if (tokenScore > 0) matchedTokens++;
    totalTokenScore += tokenScore;
  }
  if (matchedTokens === 0) return 0;

  const coverage = totalTokenScore / queryTokens.length;
  // Matching every token is worth far more than matching some of them: "VALSARTAN 160 MG" must beat
  // "VALSARTAN & HCT 80/12.5 MG", which only answers half of "Valsartan 160".
  const base = matchedTokens === queryTokens.length ? 30 + 30 * coverage : 30 * coverage;
  // Nudge tighter names ahead of longer ones that merely contain the same words.
  const density = Math.min(1, queryTokens.length / words.length);
  return base + 5 * density;
}

export function scoreStockItemForQuery(item: Partial<StockItemDTO>, query: string): number {
  const normalizedQuery = normalize(query);
  if (normalizedQuery.length === 0) return 0;
  const queryTokens = normalizedQuery.split(' ');

  let best = 0;
  for (const field of PRIMARY_FIELDS) {
    const value = item?.[field];
    if (typeof value === 'string') {
      best = Math.max(best, scoreField(value, normalizedQuery, queryTokens));
    }
  }
  for (const field of SECONDARY_FIELDS) {
    const value = item?.[field];
    if (typeof value === 'string') {
      best = Math.max(best, SECONDARY_FIELD_WEIGHT * scoreField(value, normalizedQuery, queryTokens));
    }
  }
  return best;
}

/**
 * Re-orders search results so the closest name matches come first.
 *
 * Rows that match nothing at all are dropped, but only when at least one row did match properly -
 * if the query matched via something this code cannot see (a concept synonym, say), the server's
 * result set is re-ordered and never emptied.
 */
export function rankStockItemsByRelevance<T extends Partial<StockItemDTO>>(items: T[], query: string): T[] {
  if (!Array.isArray(items) || items.length === 0) return items;
  if (!query || normalize(query).length === 0) return items;

  const scored = items.map((item, index) => ({ item, index, score: scoreStockItemForQuery(item, query) }));
  const hasRelevantMatch = scored.some(({ score }) => score >= RELEVANT_SCORE_THRESHOLD);
  const kept = hasRelevantMatch ? scored.filter(({ score }) => score > 0) : scored;

  // Sort on the original index as a tie-breaker so equally-scored rows keep the server's order.
  return kept.sort((a, b) => b.score - a.score || a.index - b.index).map(({ item }) => item);
}
