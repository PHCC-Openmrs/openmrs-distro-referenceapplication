import { describe, it, expect } from 'vitest';
import { rankStockItemsByRelevance, scoreStockItemForQuery } from './stockItemSearchRelevance';

const item = (drugName: string) => ({ drugName, commonName: drugName, uuid: drugName });

// The exact result set the server returns for "Vaslsartan 160", in its `order by si.id asc` order.
const serverResults = [
  item('CANDESARTAN & HCT 16/12.5 MG'),
  item('SACUBITRIL 24.3MG & VALSARTAN 25.7MG TAB 28/BOX'),
  item('SACUBITRIL 48.6MG & VALSARTAN 51.4 MG TAB'),
  item('VALSARTAN & HCT 160/12.5 MG'),
  item('VALSARTAN & HCT 160/25 MG'),
  item('VALSARTAN & HCT 80/12.5 MG'),
  item('VALSARTAN 160 MG'),
];

describe('rankStockItemsByRelevance', () => {
  it('puts the item the user typed first, even when misspelled', () => {
    const ranked = rankStockItemsByRelevance(serverResults, 'Vaslsartan 160');
    expect(ranked[0].drugName).toBe('VALSARTAN 160 MG');
  });

  it('ranks an exact name match ahead of items that merely contain it', () => {
    const ranked = rankStockItemsByRelevance(serverResults, 'VALSARTAN 160 MG');
    expect(ranked[0].drugName).toBe('VALSARTAN 160 MG');
  });

  it('drops rows that match nothing when better matches exist', () => {
    const ranked = rankStockItemsByRelevance(serverResults, 'Vaslsartan 160');
    expect(ranked.map((result) => result.drugName)).not.toContain('CANDESARTAN & HCT 16/12.5 MG');
  });

  it('keeps the server result set intact when nothing matches locally', () => {
    // e.g. the server matched on a concept synonym none of the name fields carry.
    const ranked = rankStockItemsByRelevance(serverResults, 'antihypertensive');
    expect(ranked).toHaveLength(serverResults.length);
  });

  it('prefers items matching every search term over items matching only some', () => {
    const ranked = rankStockItemsByRelevance(serverResults, 'valsartan 160');
    const rankOf = (name: string) => ranked.findIndex((result) => result.drugName === name);
    expect(rankOf('VALSARTAN & HCT 160/25 MG')).toBeLessThan(rankOf('VALSARTAN & HCT 80/12.5 MG'));
  });

  it('leaves the list untouched for an empty query', () => {
    expect(rankStockItemsByRelevance(serverResults, '')).toBe(serverResults);
    expect(rankStockItemsByRelevance(serverResults, null)).toBe(serverResults);
  });

  it('matches on the trade name / concept name too', () => {
    const score = scoreStockItemForQuery({ drugName: 'Some drug', conceptName: 'VALSARTAN' }, 'valsartan');
    expect(score).toBeGreaterThan(0);
  });
});
