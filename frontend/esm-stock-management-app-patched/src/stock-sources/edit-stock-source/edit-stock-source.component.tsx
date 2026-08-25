import React, { useCallback } from 'react';
import { IconButton } from '@carbon/react';
import { Edit } from '@carbon/react/icons';

import { useTranslation } from 'react-i18next';
import { type StockSource } from '../../core/api/types/stockOperation/StockSource';
import { launchWorkspace, useSession, userHasAccess } from '@openmrs/esm-framework';

interface EditStockSourcesActionMenuProps {
  data?: StockSource;
}

const EditStockSourceActionsMenu: React.FC<EditStockSourcesActionMenuProps> = ({ data }) => {
  const { t } = useTranslation();
  const session = useSession();
  const handleLaunchWorkspace = useCallback(() => {
    launchWorkspace('stock-sources-form-workspace', {
      workspaceTitle: t('editStockSource', 'Edit stock source'),
      model: data,
    });
  }, [data, t]);

  if (!userHasAccess('Task: stockmanagement.stockSources.mutate', session?.user)) {
    return null;
  }

  return (
    <IconButton
      kind="ghost"
      size="md"
      onClick={handleLaunchWorkspace}
      label={t('editStockSource', 'Edit stock source')}
    >
      <Edit size={16} />
    </IconButton>
  );
};
export default EditStockSourceActionsMenu;
