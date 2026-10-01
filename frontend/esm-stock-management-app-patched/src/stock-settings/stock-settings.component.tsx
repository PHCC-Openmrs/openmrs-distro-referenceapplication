import React from 'react';
import { Button } from '@carbon/react';
import { UserSettings } from '@carbon/react/icons';
import { useTranslation } from 'react-i18next';
import { navigate, useSession, userHasAccess } from '@openmrs/esm-framework';
import { PrivilegedView } from '../core/components/privileged-view-component/privileged-view.component';
import { APP_STOCKMANAGEMENT_SETTINGS } from '../constants';
import styles from './stock-settings.scss';

function StockSettings() {
  const { t } = useTranslation();
  const session = useSession();
  const canViewSettings = userHasAccess(APP_STOCKMANAGEMENT_SETTINGS, session?.user);

  if (!canViewSettings) {
    return (
      <PrivilegedView
        title="Can not view stock settings"
        description="You have no permissions to view stock management settings"
      />
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.tableHeader}>
        {t(
          'comingSoonUnderDev',
          'Exciting updates are on the way! In the meantime, use the link below to access Admin UI settings.',
        )}
      </div>

      <Button
        onClick={() =>
          navigate({
            to: `\${openmrsBase}/admin/maintenance/settings.list?show=Stockmanagement`,
          })
        }
        size="md"
        renderIcon={() => <UserSettings className="cds--btn__icon" size={24} />}
        kind="ghost"
      >
        {t('adminSettings', 'Admin settings')}
      </Button>
    </div>
  );
}

export default StockSettings;
