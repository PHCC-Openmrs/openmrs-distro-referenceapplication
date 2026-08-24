import React, { useEffect } from 'react';
import { ComboBox, TextInputSkeleton } from '@carbon/react';
import { type Control, Controller, type FieldValues } from 'react-hook-form';
import { type StockItemPackagingUOMDTO } from '../../../core/api/types/stockItem/StockItemPackagingUOM';
import { useStockItemPackageUnitsHook } from '../packaging-units/packaging-units.resource';

interface StockItemPackagingUnitSelectorProps<T> {
  stockItemUuid: string;
  initialUuid?: string;
  title?: string;
  placeholder?: string;
  invalid?: boolean;

  // Control
  controllerName: string;
  name: string;
  control: Control<FieldValues, T>;
}

function packagingUnitLabel(unit?: StockItemPackagingUOMDTO): string {
  if (!unit) {
    return '';
  }
  return unit.factor ? `${unit.packagingUomName} - ${unit.factor}` : (unit.packagingUomName ?? '');
}

// Lets a vendor reference row pick which of the item's own Packaging Units rows (e.g. "Box - 30")
// that vendor supplies the item in, so vendor and pack size are recorded together instead of as
// two disconnected lists.
const StockItemPackagingUnitSelector = <T,>(props: StockItemPackagingUnitSelectorProps<T>) => {
  const { items, isLoading, setStockItemUuid } = useStockItemPackageUnitsHook();

  useEffect(() => {
    setStockItemUuid(props.stockItemUuid);
  }, [props.stockItemUuid, setStockItemUuid]);

  if (isLoading) {
    return <TextInputSkeleton />;
  }

  return (
    <Controller
      name={props.controllerName}
      control={props.control}
      render={({ field: { onChange, value, ref } }) => (
        <ComboBox
          titleText={props.title}
          id={props.name}
          size={'md'}
          items={items || []}
          onChange={(data: { selectedItem: StockItemPackagingUOMDTO }) => {
            onChange(data.selectedItem?.uuid ?? null);
          }}
          initialSelectedItem={items?.find((p) => p.uuid === props.initialUuid) || null}
          itemToString={(item?: StockItemPackagingUOMDTO) => packagingUnitLabel(item)}
          shouldFilterItem={() => true}
          value={packagingUnitLabel(items?.find((p) => p.uuid === value))}
          placeholder={props.placeholder}
          ref={ref}
          invalid={props.invalid}
        />
      )}
    />
  );
};

export default StockItemPackagingUnitSelector;
