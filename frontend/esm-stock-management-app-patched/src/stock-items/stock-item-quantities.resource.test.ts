import { describe, expect, it, vi } from 'vitest';
import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import { fetchQuantitiesByItem, toQuantityMaps } from './stock-item-quantities.resource';

const mockOpenmrsFetch = vi.mocked(openmrsFetch);

describe('stock item quantities', () => {
  it('fetches every item at the location in one request', async () => {
    mockOpenmrsFetch.mockResolvedValue({
      data: {
        results: [
          {
            stockItemUuid: 'boxed',
            quantity: 6,
            quantityUoM: 'Box',
            quantityUoMUuid: 'box-uuid',
            quantityFactor: 30,
          },
          { stockItemUuid: 'not-on-page', quantity: 4, quantityUoM: 'Bottle', quantityFactor: 1 },
        ],
      },
    } as any);

    const { quantityByItem, quantityMetaByItem } = await fetchQuantitiesByItem(['boxed', 'never-stocked'], 'loc-1');

    expect(mockOpenmrsFetch).toHaveBeenCalledTimes(1);
    expect(mockOpenmrsFetch).toHaveBeenCalledWith(`${restBaseUrl}/stockmanagement/itemquantities?locationUuid=loc-1`);
    expect(quantityByItem.get('boxed')).toBe(6);
    expect(quantityMetaByItem.get('boxed')).toEqual({ quantityUoM: 'Box', quantityFactor: 30 });
    // An item with no row reads as zero with no unit, as an empty per-item inventory result did.
    expect(quantityByItem.get('never-stocked')).toBe(0);
    expect(quantityMetaByItem.has('never-stocked')).toBe(false);
    // Only the requested items are mapped.
    expect(quantityByItem.has('not-on-page')).toBe(false);
  });

  it('treats a missing or zero unit factor as 1 and skips the unit when there is none', () => {
    const { quantityByItem, quantityMetaByItem } = toQuantityMaps(
      [
        { stockItemUuid: 'a', quantity: 2, quantityUoM: 'Strip', quantityFactor: null },
        { stockItemUuid: 'b', quantity: 3, quantityUoM: null },
      ],
      ['a', 'b'],
    );
    expect(quantityMetaByItem.get('a')).toEqual({ quantityUoM: 'Strip', quantityFactor: 1 });
    expect(quantityByItem.get('b')).toBe(3);
    expect(quantityMetaByItem.has('b')).toBe(false);
  });
});
