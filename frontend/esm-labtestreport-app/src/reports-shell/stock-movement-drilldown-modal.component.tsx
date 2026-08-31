import React from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, InlineLoading } from '@carbon/react';
import { formatQuantity } from './format-quantity';
import pageStyles from './reports-page.scss';

export interface StockMovementDetailRow {
  batchNo: string | null;
  expirationDate: string | null;
  vendorName: string | null;
  quantity: number;
  unitName: string | null;
  purchaseOrderNo: string | null;
  purchaseRequestNo: string | null;
  projectFundCode: string | null;
  /** Only populated for the Wastage report - undefined for Consumption and Distribution. */
  reasonName?: string | null;
}

interface StockMovementDrilldownModalProps {
  modalHeading: string;
  rows: Array<StockMovementDetailRow>;
  isLoading: boolean;
  onClose: () => void;
  /** Shows the disposal reason column - only the Wastage report has one to show. */
  showReason?: boolean;
}

/**
 * Shared drill-down modal for the Stock Consumption/Wastage/Distribution summary reports: shows
 * how much of a clicked (item, location) cell's total came from each batch, and which vendor
 * originally supplied that batch - e.g. "100 boxes from batch A / Vendor X, 50 from batch B /
 * Vendor Y" - since a stock item can be sourced from more than one vendor and the summary count
 * alone doesn't say which batches (and therefore which vendors) made it up.
 */
export default function StockMovementDrilldownModal({
  modalHeading,
  rows,
  isLoading,
  onClose,
  showReason = false,
}: StockMovementDrilldownModalProps) {
  const { t } = useTranslation();

  return (
    <Modal open modalHeading={modalHeading} passiveModal onRequestClose={onClose}>
      {isLoading && <InlineLoading description={t('loadingBatchBreakdown', 'Loading batch breakdown...')} />}
      {!isLoading && rows.length === 0 && (
        <p>{t('noBatchBreakdownForSelection', 'No batch breakdown found for this selection.')}</p>
      )}
      {!isLoading && rows.length > 0 && (
        <div className={pageStyles.tableContainer}>
          <table className={pageStyles.dataTable}>
            <thead>
              <tr>
                <th className="left">{t('batchNo', 'Batch No')}</th>
                <th className="left">{t('expirationDate', 'Expiration Date')}</th>
                <th className="left">{t('vendor', 'Vendor')}</th>
                <th className="left">{t('purchaseOrderNo', 'Purchase Order No')}</th>
                <th className="left">{t('purchaseRequestNo', 'Purchase Request No')}</th>
                <th className="left">{t('projectFundCode', 'Project Fund Code')}</th>
                <th>{t('quantity', 'Quantity')}</th>
                {showReason && <th className="left">{t('reason', 'Reason')}</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={`${row.batchNo}-${row.vendorName}-${index}`}>
                  <td className="left">{row.batchNo ?? t('unknownBatch', 'Unknown')}</td>
                  <td className="left">{row.expirationDate?.slice(0, 10) ?? '—'}</td>
                  <td className="left">{row.vendorName ?? t('unknownVendor', 'Unknown')}</td>
                  <td className="left">{row.purchaseOrderNo || '—'}</td>
                  <td className="left">{row.purchaseRequestNo || '—'}</td>
                  <td className="left">{row.projectFundCode || '—'}</td>
                  <td>{formatQuantity(row.quantity, row.unitName)}</td>
                  {showReason && <td className="left">{row.reasonName ?? '—'}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}
