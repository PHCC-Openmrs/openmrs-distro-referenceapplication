import { type TFunction } from 'i18next';
import { formatDisplayDate } from '../../core/utils/datetimeUtils';
import { GetPrintTemplate } from '../../core/print/PrintTemplate';
import { CLOSE_PRINT_AFTER_PRINT } from '../../constants';
import { printDocument } from '../../core/print/printUtils';
import { CARE_LOGO_DATA_URI } from './careLogo';
import { type StockOperationPrintData } from './StockOperationReport';

const SRF_ORANGE = '#ED7D31';

// The form is laid out on a 12 column grid of equal-width columns.
const GRID_COLUMNS = 12;
const makeColgroup = (widths: number[]) => {
  const total = widths.reduce((x, y) => x + y, 0);
  return `<colgroup>${widths.map((w) => `<col style="width:${((w / total) * 100).toFixed(3)}%">`).join('')}</colgroup>`;
};

// Every bordered block is its own table that uses separate borders: the table draws the top/left edge and each cell
// draws its right/bottom edge, so each line is drawn exactly once and renders evenly at any print scale. This also
// overrides the global print CSS (table/td bottom borders, td:first-child left border) that caused stray/missing lines.
const SRF_CSS = `
  /* The global print CSS has no page margin (it only pads <body>, which affects just the first and last page).
     Give every printed page its own top/bottom margin instead; side spacing still comes from the body padding. */
  @page { size: A4; margin: 12mm 0 14mm 0; }
  body { padding-top: 0 !important; padding-bottom: 0 !important; }
  .srf { width: 100%; font-size: 10pt; color: #000; }
  .srf * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .srf table { width: 100%; table-layout: fixed; border-collapse: separate; border-spacing: 0; margin: 0 0 8pt 0; border: none; }
  .srf td, .srf th { border: none; padding: 3pt 4pt; vertical-align: middle; word-wrap: break-word; height: auto; font-size: 10pt; line-height: 1.2; }
  .srf table { page-break-inside: auto; }
  /* Edges are drawn on the cells (not the table), so a table that splits across pages never leaves a stray border. */
  .srf .bt td, .srf .bt th { border-right: 1pt solid #000; border-bottom: 1pt solid #000; }
  .srf .bt tr > :first-child:not(.org) { border-left: 1pt solid #000; }
  .srf .bt:not(.items) tr:first-child > *, .srf .bt thead th { border-top: 1pt solid #000; }
  .srf thead { display: table-header-group; }
  .srf tr { page-break-inside: avoid; }
  .srf table.keep { page-break-inside: avoid; }
  .srf th { font-weight: bold; text-align: center; }
  .srf .box { border: 1pt solid #000; }
  .srf .box-r { border-top: 1pt solid #000; border-right: 1pt solid #000; border-bottom: 1pt solid #000; }
  .srf .title { font-size: 20pt; font-weight: bold; text-align: center; color: #000; }
  .srf .label, .srf .title, .srf .org { background: ${SRF_ORANGE} !important; font-weight: bold; }
  .srf .c { text-align: center; }
  .srf .row-data td { height: 26pt; }
  .srf .remarks-box td { height: 60pt; vertical-align: top; }
  .srf .sign td { height: 24pt; }
  .srf .sign .org, .srf .sign .label { font-size: 9pt; }
  .srf .sign td.signature { height: 56pt; }
  .srf .sign td.filled { text-align: center; font-size: 9pt; }
  .srf .care-logo { display: block; height: 40pt; width: auto; max-width: 100%; }
`;

const esc = (v: unknown): string =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

export const FormatRequisitionDocument = async (data: StockOperationPrintData, t: TFunction): Promise<string> => {
  const items = data?.items ?? [];
  // "Stock Requisition Form", "Stock Adjustment Form", ... - named after the operation type.
  // "Opening Stock" reads better as "Stock Opening Form".
  const rawTypeName = (data?.operationTypeName ?? '').trim();
  const typeName = /^opening\s+stock$/i.test(rawTypeName) ? 'Stock Opening' : rawTypeName;
  const formTitle = (/^stock\b/i.test(typeName) ? `${typeName} Form` : `Stock ${typeName} Form`)
    .replace(/\s+/g, ' ')
    .toUpperCase();
  const colgroup = makeColgroup(Array(GRID_COLUMNS).fill(1));
  const authColgroup = makeColgroup([16, 21, 21, 21, 21]);

  const itemRows = items
    .map((p, index) => {
      const uom = p.quantityRequiredUoM ?? p.quantityIssuedUoM ?? '';
      const balance =
        p.balanceOnHand === undefined
          ? ''
          : p.balanceOnHand === 0
          ? '0'
          : `${p.balanceOnHand.toLocaleString()} ${p.balanceOnHandUoM ?? ''}${
              p.balanceOnHandDispensing
                ? ` (${p.balanceOnHandDispensing.toLocaleString()} ${p.balanceOnHandDispensingUoM ?? ''})`
                : ''
            }`.trim();
      const expiry = [
        p.batchNumber ? `${t('batchNumber', 'Batch')}: ${p.batchNumber}` : '',
        p.expiryDate ? formatDisplayDate(p.expiryDate) : '',
      ]
        .filter(Boolean)
        .join(' / ');
      return `
      <tr class="row-data">
        <td class="c">${index + 1}</td>
        <td colspan="3">${esc(p.itemDescription)}</td>
        <td class="c">${esc(balance)}</td>
        <td></td>
        <td class="c">${esc(uom)}</td>
        <td colspan="2" class="c">${esc(p.quantityRequired?.toLocaleString() ?? '')}</td>
        <td colspan="3">${esc(expiry)}</td>
      </tr>`;
    })
    .join('');

  return `
  <style>${SRF_CSS}</style>
  <div class="srf">
    <table>
      ${colgroup}
      <tr>
        <td colspan="7" style="height:48pt"><img class="care-logo" alt="CARE" src="${CARE_LOGO_DATA_URI}" /></td>
        <td colspan="5" class="title box">${esc(formTitle)}</td>
      </tr>
      <tr><td colspan="12" style="height:8pt;padding:0"></td></tr>
      <tr>
        <td colspan="7"></td>
        <td class="label box">${t('srfNo', 'SRF No.')}</td>
        <td colspan="4" class="box-r">${esc(data?.operationNumber)}</td>
      </tr>
    </table>
    <table class="bt">
      ${colgroup}
      <tr>
        <td colspan="2" class="label">${t('dateLabel', 'Date:')}</td>
        <td colspan="${data?.deliverFrom ? 2 : 4}">${esc(formatDisplayDate(data?.operationDate))}</td>
        ${
          data?.deliverFrom
            ? `<td colspan="2" class="label">${t('deliverFrom', 'Deliver from:')}</td>
        <td colspan="2">${esc(data.deliverFrom)}</td>`
            : ''
        }
        <td colspan="2" class="label">${t('deliverTo', 'Deliver to:')}</td>
        <td colspan="${data?.deliverFrom ? 2 : 4}">${esc(data?.deliverTo ?? data?.location)}</td>
      </tr>
      <tr>
        <td colspan="2" class="label">${t('requestor', 'Requestor:')}</td>
        <td colspan="${data?.deliverFrom ? 2 : 4}">${esc(data?.requestedBy)}</td>
        <td colspan="2" class="label">${t('contactNameAndTelNo', 'Contact Name &amp; Tel No:')}</td>
        <td colspan="${data?.deliverFrom ? 6 : 4}">${esc(data?.requestedContact)}</td>
      </tr>
    </table>
    <table class="bt items">
      ${colgroup}
      <thead><tr>
        <th>#</th>
        <th colspan="3">${t('productDescription', 'Product Description')}</th>
        <th>${t('balanceOnHand', 'Balance on Hand')}</th>
        <th>${t('projectFundCode', 'Project Fund Code')}</th>
        <th>${t('unitOfMeasure', 'Unit of measure')}</th>
        <th colspan="2">${t('totalQuantityRequired', 'Total Quantity Required')}</th>
        <th colspan="3">${t('additionalInformationExpiryDate', 'Additional information (Expiry Date)')}</th>
      </tr></thead>
      <tbody>${itemRows}</tbody>
    </table>
    <table class="bt keep">
      ${colgroup}
      <tr><td colspan="12" class="label">${t('remarks', 'Remarks')}</td></tr>
      <tr class="remarks-box"><td colspan="12">${esc(data?.remarks)}</td></tr>
    </table>
    <table class="bt keep">
      ${authColgroup}
      <tr class="sign">
        <td rowspan="2" class="label">${t('authorisation', 'Authorisation')}</td>
        <td class="label c">${t('goodsRequestedBy', 'Goods requested by')}</td>
        <td class="label c">${t('releaseOfGoodsAuthorisedBy', 'Release of goods authorised by')}</td>
        <td class="label c">${t('goodsReleasedBy', 'Goods released by')}</td>
        <td class="label c">${t('goodsReceivedBy', 'Goods received by')}</td>
      </tr>
      <tr class="sign">
        <td class="c org">${t('requester', 'Requester:')}</td>
        <td class="c org">${t('programmeLead', 'Programme Lead')}</td>
        <td class="c org">${t('storekeeperWarehouseLead', 'Storekeeper/Warehouse Lead').replace('/', '/<wbr>')}</td>
        <td class="c org">${t('receiver', 'Receiver:')}</td>
      </tr>
      <tr class="sign">
        <td class="label">${t('nameLabel', 'Name:')}</td>
        <td class="filled">${esc(data?.requestedBy)}</td>
        <td></td>
        <td class="filled">${esc(data?.approvedBy)}</td>
        <td></td>
      </tr>
      <tr class="sign">
        <td class="label">${t('dateLabel', 'Date:')}</td>
        <td class="filled">${data?.requestedBy ? esc(formatDisplayDate(data?.requestedDate)) : ''}</td>
        <td></td>
        <td class="filled">${data?.approvedBy ? esc(formatDisplayDate(data?.approvedDate)) : ''}</td>
        <td></td>
      </tr>
      <tr class="sign">
        <td class="label signature">${t('signature', 'Signature:')}</td>
        <td class="signature"></td>
        <td class="signature"></td>
        <td class="signature"></td>
        <td class="signature"></td>
      </tr>
    </table>
  </div>
  `;
};

export const PrintRequisitionStockOperation = async (data: StockOperationPrintData, t: TFunction) => {
  const printData = await FormatRequisitionDocument(data, t);
  printDocument(GetPrintTemplate(printData, data?.documentTitle, true, CLOSE_PRINT_AFTER_PRINT));
};
