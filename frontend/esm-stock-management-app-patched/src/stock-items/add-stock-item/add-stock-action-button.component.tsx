import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@carbon/react';
import { useSession, userHasAccess } from '@openmrs/esm-framework';
import { launchAddOrEditStockItemWorkspace } from '../stock-item.utils';

const AddStockItemActionButton: React.FC = () => {
  const { t } = useTranslation();
  const session = useSession();

  const handleAddOrLaunchStockItemWorkspace = useCallback(() => {
    launchAddOrEditStockItemWorkspace(t);
  }, [t]);

  if (!userHasAccess('Task: stockmanagement.stockItems.mutate', session?.user)) {
    return null;
  }

  return (
    <Button onClick={handleAddOrLaunchStockItemWorkspace} size="md" kind="primary">
      {t('addStockItem', 'Add stock item')}
    </Button>
  );
};

export default AddStockItemActionButton;
