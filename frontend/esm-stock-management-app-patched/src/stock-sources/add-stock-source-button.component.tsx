import { Button } from '@carbon/react';
import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { launchWorkspace, useSession, userHasAccess } from '@openmrs/esm-framework';

const AddStockSourceActionButton: React.FC = () => {
  const { t } = useTranslation();
  const session = useSession();

  const handleClick = useCallback(() => {
    launchWorkspace('stock-sources-form-workspace', {
      workspaceTitle: t('addNewStockSource', 'Add new source'),
    });
  }, [t]);

  if (!userHasAccess('Task: stockmanagement.stockSources.mutate', session?.user)) {
    return null;
  }

  return (
    <Button onClick={handleClick} size="md" kind="primary">
      {t('addNewStockSource', 'Add new source')}
    </Button>
  );
};

export default AddStockSourceActionButton;
