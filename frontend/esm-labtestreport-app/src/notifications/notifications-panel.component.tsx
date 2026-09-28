import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button, InlineLoading } from '@carbon/react';
import {
  Box,
  Chemistry,
  Delivery,
  Hourglass,
  Information,
  Medication,
  Microscope,
  Time,
  UserFollow,
  WarningAlt,
} from '@carbon/react/icons';
import { formatDatetime, navigate } from '@openmrs/esm-framework';
import {
  getNotificationLink,
  markAllNotificationsRead,
  markNotificationRead,
  useNotifications,
  type Notification,
  type NotificationType,
} from './notifications.resource';
import styles from './notifications.scss';

const typeIcons: Record<NotificationType, React.ComponentType<{ size?: number }>> = {
  LAB_RESULT: Chemistry,
  LAB_ORDER: Microscope,
  MEDICATION_ORDER: Medication,
  PATIENT_REGISTERED: UserFollow,
  PATIENT_QUEUED: Time,
  STOCK_OPERATION: Delivery,
  LOW_STOCK: Box,
  STOCK_EXPIRY: Hourglass,
  GENERAL: Information,
};

/**
 * List of the user's unread notifications (lab results, new orders, registrations, queue entries,
 * stock approvals and stock alerts), rendered inside the navbar's Notifications panel
 * (notifications-nav-menu-slot). Clicking one marks it read and opens the page it is about.
 */
const NotificationsPanel: React.FC = () => {
  const { t } = useTranslation();
  const { notifications, error, isLoading } = useNotifications();

  const typeLabels: Record<NotificationType, string> = {
    LAB_RESULT: t('notificationTypeLabResult', 'Lab result'),
    LAB_ORDER: t('notificationTypeLabOrder', 'Lab order'),
    MEDICATION_ORDER: t('notificationTypeMedicationOrder', 'Medication order'),
    PATIENT_REGISTERED: t('notificationTypePatientRegistered', 'New patient'),
    PATIENT_QUEUED: t('notificationTypePatientQueued', 'Queue'),
    STOCK_OPERATION: t('notificationTypeStockOperation', 'Stock operation'),
    LOW_STOCK: t('notificationTypeLowStock', 'Low stock'),
    STOCK_EXPIRY: t('notificationTypeStockExpiry', 'Expiring stock'),
    GENERAL: t('notificationTypeGeneral', 'System'),
  };

  const openNotification = (notification: Notification) => {
    markNotificationRead(notification.id);
    const link = getNotificationLink(notification);
    if (link) {
      navigate({ to: link });
    }
  };

  if (isLoading) {
    return <InlineLoading className={styles.status} description={t('loading', 'Loading...')} />;
  }
  if (error) {
    return <p className={styles.status}>{t('notificationsError', 'Could not load notifications.')}</p>;
  }
  if (notifications.length === 0) {
    return <p className={styles.status}>{t('noNotifications', 'No new notifications.')}</p>;
  }

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <span>{t('notifications', 'Notifications')}</span>
        <Button kind="ghost" size="sm" onClick={() => markAllNotificationsRead()}>
          {t('markAllRead', 'Mark all read')}
        </Button>
      </div>
      <ul className={styles.list}>
        {notifications.map((notification) => {
          const Icon = typeIcons[notification.type] ?? WarningAlt;
          return (
            <li key={notification.id}>
              <button type="button" className={styles.item} onClick={() => openNotification(notification)}>
                <Icon size={20} className={styles.icon} />
                <span className={styles.body}>
                  <span className={styles.type}>{typeLabels[notification.type] ?? typeLabels.GENERAL}</span>
                  <span className={styles.message}>{notification.message}</span>
                  <span className={styles.date}>
                    {formatDatetime(new Date(notification.dateCreated), { mode: 'wide' })}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default NotificationsPanel;
