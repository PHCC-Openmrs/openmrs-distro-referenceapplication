import React from 'react';
import { useTranslation } from 'react-i18next';
import { HeaderGlobalAction } from '@carbon/react';
import { Close, Notification } from '@carbon/react/icons';
import { useNotifications } from './notifications.resource';
import styles from './notifications.scss';

const PANEL_NAME = 'notificationsMenu';

interface NotificationsButtonProps {
  isActivePanel: (panelName: string) => boolean;
  togglePanel: (panelName: string) => void;
}

/**
 * Bell in the navbar's notifications-menu-button-slot. It opens the navbar's own Notifications
 * panel, where the notifications panel extension renders the list.
 */
const NotificationsButton: React.FC<NotificationsButtonProps> = ({ isActivePanel, togglePanel }) => {
  const { t } = useTranslation();
  const { notifications } = useNotifications();
  const isOpen = isActivePanel(PANEL_NAME);

  return (
    <HeaderGlobalAction
      aria-label={t('notifications', 'Notifications')}
      className={styles.bellButton}
      isActive={isOpen}
      onClick={() => togglePanel(PANEL_NAME)}
    >
      {isOpen ? <Close size={20} /> : <Notification size={20} />}
      {!isOpen && notifications.length > 0 && (
        <span className={styles.badge}>{notifications.length > 99 ? '99+' : notifications.length}</span>
      )}
    </HeaderGlobalAction>
  );
};

export default NotificationsButton;
