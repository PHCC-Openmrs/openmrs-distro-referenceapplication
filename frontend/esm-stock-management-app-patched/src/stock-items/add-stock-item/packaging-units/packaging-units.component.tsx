import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  DataTable,
  DataTableSkeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
} from '@carbon/react';
import { Add, Save, TrashCan } from '@carbon/react/icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormProvider, useForm, useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { getCoreTranslation, restBaseUrl, showSnackbar } from '@openmrs/esm-framework';
import { createStockItemPackagingUnit, updateStockItemPackagingUnit } from '../../stock-items.resource';
import { useHandleMutate } from '../../../utils';
import { type PackageUnitFormData, packageUnitSchema } from './validationSchema';
import { type StockItemPackagingUOMDTO } from '../../../core/api/types/stockItem/StockItemPackagingUOM';
import { useStockItemPackageUnitsHook } from './packaging-units.resource';
import ControlledNumberInput from '../../../core/components/carbon/controlled-number-input.component';
import DeletePackagingUnitActionButton from './delete-packaging-unit-action-button.component';
import PackagingUnitsConceptSelector from '../packaging-units-concept-selector/packaging-units-concept-selector.component';
import { type CustomTableHeader, type CustomTableRow } from '../../../core/components/table/types';
import styles from './packaging-units.scss';

interface PackagingUnitsProps {
  isEditing?: boolean;
  onSubmit?: () => void;
  stockItemUuid: string;
  handleTabChange: (index) => void;
  onCloseWorkspace?: () => void;
}

const PackagingUnits: React.FC<PackagingUnitsProps> = ({ stockItemUuid, handleTabChange, onCloseWorkspace }) => {
  const { items, isLoading, setStockItemUuid, mutate } = useStockItemPackageUnitsHook();

  const [packagingUnits, setPackagingUnits] = useState<StockItemPackagingUOMDTO[]>(items);

  const [newUnit, setNewUnit] = useState<{
    factor: number;
    packagingUomUuid: string;
    packagingUomName: string;
  }>({
    packagingUomUuid: undefined,
    factor: 0,
    packagingUomName: '',
  });

  // The blank "new unit" row is only shown on demand once the item already has units;
  // showing it by default led users to fill it in instead of editing the existing row,
  // creating duplicate packaging units on save.
  const [isAddingUnit, setIsAddingUnit] = useState(false);
  const showNewUnitRow = isAddingUnit || items.length === 0;

  useEffect(() => {
    setStockItemUuid(stockItemUuid);
  }, [stockItemUuid, setStockItemUuid]);

  useEffect(() => {
    setPackagingUnits(items);
  }, [items]);

  const { t } = useTranslation();

  const handleMutate = useHandleMutate();
  const tableHeaders = useMemo<CustomTableHeader[]>(
    () => [
      {
        key: 'packaging',
        header: t('packagingUnit', 'Packaging Unit'),
        styles: { width: '50%' },
      },
      {
        key: 'quantity',
        header: t('packSize', 'Pack Size'),
        styles: { width: '50%' },
      },
      {
        key: 'action',
        header: t('action', 'Actions'),
        styles: { width: '50%' },
      },
    ],
    [t],
  );

  const packageUnitForm = useForm<PackageUnitFormData>({
    defaultValues: {},
    mode: 'all',
    resolver: zodResolver(packageUnitSchema),
  });

  const resetNewUnit = () => {
    setNewUnit({
      factor: 0,
      packagingUomUuid: undefined,
      packagingUomName: '',
    });
  };

  const handleSavePackageUnits = () => {
    const { reset } = packageUnitForm;

    const isNewUnitTouched = Boolean(newUnit.packagingUomUuid) || newUnit.factor > 0;
    if (showNewUnitRow && isNewUnitTouched && !hasValidNewUnit) {
      showSnackbar({
        title: t('savePackagingUnitErrorTitle', 'Package Unit'),
        subtitle: t(
          'newPackagingUnitIncomplete',
          'Select a packaging unit and enter a pack size greater than 0, or remove the new row',
        ),
        kind: 'error',
      });
      return;
    }

    const newPayload = newUnit
      ? {
          factor: newUnit.factor,
          packagingUomUuid: newUnit.packagingUomUuid,
          stockItemUuid,
        }
      : null;

    // Filter changed units
    const updatedUnits = packagingUnits.filter((unit) => {
      const originalUnit = items.find((item) => item.uuid === unit.uuid);
      return originalUnit && originalUnit.factor !== unit.factor;
    });

    // Create new unit
    const createPromises =
      showNewUnitRow && hasValidNewUnit
        ? createStockItemPackagingUnit(newPayload).then(
            () => {
              showSnackbar({
                title: t('savePackingUnitTitle', 'Package Unit'),
                subtitle: t('savePackingUnitMessage', 'Package Unit saved successfully'),
                kind: 'success',
              });
              resetNewUnit();
              setIsAddingUnit(false);
            },
            () => {
              showSnackbar({
                title: t('savePackagingUnitErrorTitle', 'Package Unit'),
                subtitle: t('savePackagingUnitErrorMessage', 'Error saving package unit'),
                kind: 'error',
              });
            },
          )
        : Promise.resolve({ status: 'no-create' });

    // Update existing units
    const updatePromises = updatedUnits.map((unit) =>
      updateStockItemPackagingUnit(unit, unit.uuid).then(
        () => {
          showSnackbar({
            title: t('updatePackingUnitTitle', 'Package Unit'),
            subtitle: t('updatePackingUnitMessage', 'Package Unit {{ name }} updated successfully', {
              name: unit.packagingUomName,
            }),
            kind: 'success',
          });
        },
        () => {
          showSnackbar({
            title: t('updatePackagingUnitErrorTitle', 'Package Unit'),
            subtitle: t('updatePackagingUnitErrorMessage', 'Error updating package unit {{name}}', {
              name: unit.packagingUomName,
            }),
            kind: 'error',
          });
        },
      ),
    );

    // Wait for all requests to complete
    Promise.all([createPromises, ...updatePromises]).then(() => {
      mutate();
      handleMutate(`${restBaseUrl}/stockmanagement/stockitem`);
      reset();
      onCloseWorkspace?.();
    });
  };
  const handleCancelPackagingUnits = () => {
    handleTabChange(0);
  };
  // A stock item needs at least one packaging unit to be usable, so the save/finish
  // action stays disabled until one already exists or a valid new row is ready to submit.
  const hasValidNewUnit = Boolean(newUnit.packagingUomUuid) && newUnit.factor > 0;
  const canFinish = packagingUnits.length > 0 || hasValidNewUnit;
  const handleNewUnitFactorChange = (value: string | number) => {
    setNewUnit({
      ...newUnit,
      factor: Number(value),
    });
  };

  const handleNewUnitPackageUnitChange = (unit: { uuid: string; display: string }) => {
    setNewUnit({
      ...newUnit,
      packagingUomUuid: unit.uuid,
      packagingUomName: unit.display,
    });
  };

  const handleRemoveNewUnitRow = () => {
    resetNewUnit();
    setIsAddingUnit(false);
  };

  const onFactorFieldUpdate = (row: StockItemPackagingUOMDTO, value: string | number) => {
    const qtyValue = typeof value === 'number' ? value : parseFloat(value);

    setPackagingUnits((prevState) =>
      prevState.map((item) => (item.uuid === row.uuid ? { ...item, factor: qtyValue } : item)),
    );
  };

  if (isLoading) return <DataTableSkeleton showHeader={false} rowCount={5} columnCount={5} zebra />;

  return (
    <FormProvider {...packageUnitForm}>
      <DataTable
        rows={
          [
            ...items.map((item, idx) => ({ ...item, id: item.uuid || `item-${idx}` })),
            ...(showNewUnitRow ? [{ id: 'new-row' }] : []),
          ] as CustomTableRow[]
        }
        headers={tableHeaders as any}
        isSortable={false}
        useZebraStyles
      >
        {({ headers, getHeaderProps, getTableProps }) => (
          <TableContainer className={styles.packagingTableContainer}>
            <Table {...getTableProps()} className={styles.packingTable}>
              <TableHead>
                <TableRow>
                  {headers.map((header) => {
                    const customHeader = header as CustomTableHeader;
                    return (
                      <TableHeader
                        {...getHeaderProps({
                          header,
                          isSortable: false,
                        })}
                        style={customHeader.styles}
                        key={header.key}
                      >
                        {typeof customHeader.header === 'object' &&
                        customHeader.header !== null &&
                        'content' in customHeader.header
                          ? (customHeader.header.content as React.ReactNode)
                          : (customHeader.header as React.ReactNode)}
                      </TableHeader>
                    );
                  })}
                  <TableHeader style={{ width: '70%' }} />
                </TableRow>
              </TableHead>
              <TableBody className={styles.packingTableBody}>
                {items?.map((row: StockItemPackagingUOMDTO, index) => (
                  <PackagingUnitRow
                    row={row}
                    id={`${index}-${row?.uuid}`}
                    onChange={(value) => onFactorFieldUpdate(row, value)}
                  />
                ))}
                {showNewUnitRow && (
                  <PackagingUnitRow
                    row={newUnit || {}}
                    id="new-package-unit"
                    isEditing
                    excludedPackagingUomUuids={items.map((item) => item.packagingUomUuid)}
                    onChangePackageUnit={(value) => handleNewUnitPackageUnitChange(value)}
                    onChange={(value) => handleNewUnitFactorChange(value)}
                    onRemove={items.length > 0 ? handleRemoveNewUnitRow : undefined}
                  />
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DataTable>
      {!showNewUnitRow && (
        <Button kind="ghost" renderIcon={Add} onClick={() => setIsAddingUnit(true)}>
          {t('addPackagingUnit', 'Add packaging unit')}
        </Button>
      )}
      <div className={styles.packageUnitsBtn}>
        <Button kind="secondary" onClick={handleCancelPackagingUnits}>
          {getCoreTranslation('cancel')}
        </Button>
        <Button
          name="save"
          type="submit"
          className="submitButton"
          onClick={handleSavePackageUnits}
          kind="primary"
          renderIcon={Save}
          disabled={!canFinish}
        >
          {getCoreTranslation('save')}
        </Button>
      </div>
    </FormProvider>
  );
};

export default PackagingUnits;

const PackagingUnitRow: React.FC<{
  isEditing?: boolean;
  row: StockItemPackagingUOMDTO;
  id?: string;
  onChange?: (value: string | number) => void;
  onChangePackageUnit?: (value: { uuid: string; display: string }) => void;
  onRemove?: () => void;
  excludedPackagingUomUuids?: string[];
}> = ({ isEditing, row, id, onChange, onChangePackageUnit, onRemove, excludedPackagingUomUuids }) => {
  const { t } = useTranslation();
  const {
    control,
    formState: { errors },
  } = useFormContext();
  const minPackagingQuantity = 0;

  return (
    <>
      <TableRow>
        <TableCell>
          {isEditing ? (
            <PackagingUnitsConceptSelector
              row={row}
              controllerName={'packagingUomUuid'}
              name="packagingUomUuid"
              placeholder={t('packagingUnitFilterPlaceholder', 'Filter')}
              control={control}
              onPackageUnitChange={(concept) => onChangePackageUnit(concept)}
              excludedUuids={excludedPackagingUomUuids}
              invalid={!!errors.packagingUomUuid}
            />
          ) : (
            (!isEditing || !row.uuid.startsWith('new-item')) && row?.packagingUomName
          )}
        </TableCell>
        <TableCell>
          <ControlledNumberInput
            row={row}
            controllerName="factor"
            name="factor"
            min={minPackagingQuantity}
            control={control}
            id={id}
            invalid={!!errors.factor}
            hideSteppers={true}
            onChange={(e, state) => onChange(state.value)}
          />
        </TableCell>
        <TableCell>
          {isEditing ? (
            onRemove && (
              <Button
                type="button"
                size="sm"
                kind="ghost"
                className="clear-padding-margin"
                iconDescription={t('remove', 'Remove')}
                hasIconOnly
                renderIcon={TrashCan}
                onClick={onRemove}
              />
            )
          ) : (
            <DeletePackagingUnitActionButton row={row} />
          )}
        </TableCell>
      </TableRow>
    </>
  );
};
