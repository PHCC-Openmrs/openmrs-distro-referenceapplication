import React, { useCallback } from 'react';
import { Button } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { launchWorkspace, useSession, userHasAccess } from '@openmrs/esm-framework';

const AddStockUserRoleScopeActionButton: React.FC = () => {
  const { t } = useTranslation();
  const session = useSession();

  const handleClick = useCallback(() => {
    launchWorkspace('stock-user-role-scopes-form-workspace', {
      workspaceTitle: t('addNewUserRoleScope', 'Add new user role scope'),
    });
  }, [t]);

  if (!userHasAccess('Task: stockmanagement.userRoleScopes.mutate', session?.user)) {
    return null;
  }

  return (
    <Button kind="primary" onClick={handleClick} size="md">
      {t('addNewUserRoleScope', 'Add new user role scope')}
    </Button>
  );
};

export default AddStockUserRoleScopeActionButton;
