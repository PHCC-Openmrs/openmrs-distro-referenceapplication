import React from 'react';
import { Button } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { useSession, userHasAccess } from '@openmrs/esm-framework';
import { type StockItemDTO } from '../../core/api/types/stockItem/StockItem';
import { launchAddOrEditStockItemWorkspace } from '../stock-item.utils';

interface EditStockItemActionsMenuProps {
  data: StockItemDTO;
}

const EditStockItemActionsMenu: React.FC<EditStockItemActionsMenuProps> = ({ data }) => {
  const { t } = useTranslation();
  const session = useSession();
  const itemName = `${data?.drugName ?? data.conceptName}`;

  if (!userHasAccess('Task: stockmanagement.stockItems.mutate', session?.user)) {
    return <>{itemName}</>;
  }

  return (
    <Button
      kind="ghost"
      size="md"
      onClick={() => {
        data.isDrug = !!data.drugUuid;
        launchAddOrEditStockItemWorkspace(t, data);
      }}
      iconDescription={t('editStockItem', 'Edit stock item')}
    >
      {itemName}
    </Button>
  );
};
export default EditStockItemActionsMenu;
