import { describe, expect, it } from 'vitest';
import {
  buildRemarksWithOtherReason,
  getOperationReasonDisplay,
  getReasonDisplayName,
  isOtherReasonName,
  operationTypeSupportsOtherReason,
  parseRemarksWithOtherReason,
} from './other-reason.utils';

describe('other reason utils', () => {
  it('only supports the other reason on adjustment and disposal', () => {
    expect(operationTypeSupportsOtherReason('adjustment')).toBe(true);
    expect(operationTypeSupportsOtherReason('disposed')).toBe(true);
    expect(operationTypeSupportsOtherReason('stocktake')).toBe(false);
    expect(operationTypeSupportsOtherReason('receipt')).toBe(false);
    expect(operationTypeSupportsOtherReason(undefined)).toBe(false);
  });

  it('treats the Miscellaneous concept as Other', () => {
    expect(isOtherReasonName('Miscellaneous')).toBe(true);
    expect(isOtherReasonName(' miscellaneous ')).toBe(true);
    expect(isOtherReasonName('Medication expired')).toBe(false);
    expect(getReasonDisplayName('Miscellaneous', 'Other')).toBe('Other');
    expect(getReasonDisplayName('Medication expired', 'Other')).toBe('Medication expired');
    expect(getReasonDisplayName(undefined, 'Other')).toBe('');
  });

  it('puts the reason before the remarks', () => {
    expect(buildRemarksWithOtherReason('Damaged in transit', '')).toBe('Reason: Damaged in transit');
    expect(buildRemarksWithOtherReason('Damaged in transit', 'Box 4')).toBe('Reason: Damaged in transit\nBox 4');
    expect(buildRemarksWithOtherReason('  one\ntwo ', null)).toBe('Reason: one two');
  });

  it('leaves the remarks untouched when there is no reason text', () => {
    expect(buildRemarksWithOtherReason('', 'Box 4')).toBe('Box 4');
    expect(buildRemarksWithOtherReason(undefined, undefined)).toBe('');
  });

  it('splits the reason back out of the remarks', () => {
    expect(parseRemarksWithOtherReason('Reason: Damaged in transit\nBox 4')).toEqual({
      otherReason: 'Damaged in transit',
      remarks: 'Box 4',
    });
    expect(parseRemarksWithOtherReason('Reason: Damaged in transit')).toEqual({
      otherReason: 'Damaged in transit',
      remarks: '',
    });
    expect(parseRemarksWithOtherReason('Just a remark')).toEqual({ otherReason: '', remarks: 'Just a remark' });
    expect(parseRemarksWithOtherReason(null)).toEqual({ otherReason: '', remarks: '' });
  });

  it('shows the typed reason of a saved Other reason', () => {
    const disposal = { operationType: 'disposed', reasonName: 'Miscellaneous' };
    expect(getOperationReasonDisplay({ ...disposal, remarks: 'Reason: Damaged\nBox 4' }, 'Other')).toBe('Damaged');
    expect(getOperationReasonDisplay({ ...disposal, remarks: 'Box 4' }, 'Other')).toBe('Other');
    expect(getOperationReasonDisplay({ ...disposal, remarks: null }, 'Other')).toBe('Other');
  });

  it('shows other reasons, and other operation types, as saved', () => {
    expect(
      getOperationReasonDisplay(
        { operationType: 'adjustment', reasonName: 'Medication expired', remarks: 'x' },
        'Other',
      ),
    ).toBe('Medication expired');
    expect(
      getOperationReasonDisplay(
        { operationType: 'stocktake', reasonName: 'Miscellaneous', remarks: 'Reason: x' },
        'Other',
      ),
    ).toBe('Miscellaneous');
  });

  it('round-trips build and parse', () => {
    const built = buildRemarksWithOtherReason('Spilled', 'Cleaned up\nReported');
    expect(parseRemarksWithOtherReason(built)).toEqual({ otherReason: 'Spilled', remarks: 'Cleaned up\nReported' });
  });
});
