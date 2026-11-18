export interface StockBatchDTO {
  uuid: string;
  batchNo: string;
  expiration: Date;
  stockItemUuid: string;
  quantity: string;
  voided: boolean;
  // Packed PO/PR/Fund codes of the Opening Stock (or Receipt) that brought this batch in - see
  // parseExternalReference.
  originExternalReference?: string | null;
}

export interface StockBatchWithUoM extends StockBatchDTO {
  quantityUoM?: string;
  quantityFactor?: string;
  quantityUoMUuid?: string;
  partyName?: string;
  locationUuid?: string;
  partyUuid?: string;
}
