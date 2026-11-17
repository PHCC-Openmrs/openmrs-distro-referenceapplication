import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@carbon/react';
import { WarningHex, WarningAlt } from '@carbon/react/icons';
import { showModal } from '@openmrs/esm-framework';
import { useStockDashboardSummary } from './stock-home-dashboard-summary.resource';
import { daysUntilExpiry, EXPIRY_WINDOW_DAYS } from './stock-home-metric-history.utils';
import useFilteredOperationTypesByRoles from '../stock-operations/stock-operations-forms/hooks/useFilteredOperationTypesByRoles';
import {
  findRequisitionOperationType,
  launchReorderOperation,
  type ReorderItem,
} from './launch-reorder-operation.utils';
import styles from './stock-home-detail-card.scss';

const StockHomeInventoryCard = () => {
  const { t } = useTranslation();
  const { expiringBatches, outOfStockItems, understockedItems, isLoading } = useStockDashboardSummary();
  const { operationTypes } = useFilteredOperationTypesByRoles();
  const requisitionOperationType = findRequisitionOperationType(operationTypes);

  if (isLoading) {
    return null;
  }

  const currentDate = new Date();

  // Not yet expired, and expiring within the window; the server already sorts soonest first.
  const expiringSoon = expiringBatches.filter((item) => {
    const differenceInDays = daysUntilExpiry(item.expiration, currentDate);
    return differenceInDays <= EXPIRY_WINDOW_DAYS && differenceInDays >= 0;
  });

  const filteredData = expiringSoon.slice(0, 3);
  const understockedToShow = understockedItems.slice(0, 3);

  const launchExpiredStockModal = () => {
    const dispose = showModal('expired-stock-modal', {
      closeModal: () => dispose(),
      expiredStock: expiringSoon,
    });
  };

  const launchOutOfStockModal = () => {
    const dispose = showModal('out-of-stock-modal', {
      closeModal: () => dispose(),
      outOfStockItems,
      understockedItems,
    });
  };

  const handleReorder = (item: ReorderItem) => {
    launchReorderOperation(t, requisitionOperationType, item);
  };

  if (filteredData.length === 0 && understockedToShow.length === 0) {
    return <p className={styles.content}>{t('noInventoryAlerts', 'No inventory alerts to display')}</p>;
  }

  return (
    <>
      {filteredData.map((item, index) => (
        <div className={styles.card} key={`expiring-${index}`}>
          <div className={styles.colorLineRed} />
          <div className={styles.icon}>
            <WarningHex size={40} color={'#DA1E28'} />
          </div>
          <div className={styles.cardText}>
            <p>{t('expiringStock', 'Expiring stock')}</p>
            <p>
              <strong>{item?.drugName || item?.displayName}</strong> {t('batchNumberLabel', 'Batch number:')}{' '}
              {item?.batchNo} {t('quantityLabel', 'Quantity:')} {item?.quantity}{' '}
              {item?.quantityUoM ?? item?.dispensingUnitName}
            </p>
          </div>
        </div>
      ))}
      {understockedToShow.map((item, index) => (
        <div className={styles.card} key={`understocked-${index}`}>
          <div className={styles.colorLineOrange} />
          <div className={styles.icon}>
            <WarningAlt size={40} color={'#FF832B'} />
          </div>
          <div className={styles.cardText}>
            <p>{t('understockedItem', 'Understocked')}</p>
            <p>
              <strong>{item?.displayName}</strong> {t('quantityLabel', 'Quantity:')} {item?.quantity}{' '}
              {t('reorderLevelLabel', '· Reorder level:')} {item?.reorderLevel}
            </p>
          </div>
          <Button kind="ghost" size="sm" onClick={() => handleReorder(item)}>
            {t('reorder', 'Reorder')}
          </Button>
        </div>
      ))}
      <div className={styles.action}>
        {filteredData.length > 0 && (
          <Button kind="ghost" onClick={launchExpiredStockModal} size="sm">
            {t('viewAllExpiring', 'View all expiring')}
          </Button>
        )}
        {understockedToShow.length > 0 && (
          <Button kind="ghost" onClick={launchOutOfStockModal} size="sm">
            {t('viewAllUnderstocked', 'View all understocked')}
          </Button>
        )}
      </div>
    </>
  );
};

export default StockHomeInventoryCard;
