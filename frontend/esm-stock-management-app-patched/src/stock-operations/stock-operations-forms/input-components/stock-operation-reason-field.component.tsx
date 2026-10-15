import React, { useEffect } from 'react';
import { TextInput } from '@carbon/react';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useConfig } from '@openmrs/esm-framework';
import { type ConfigObject } from '../../../config-schema';
import { useConcept } from '../../../stock-lookups/stock-lookups.resource';
import { isOtherReasonName, operationTypeSupportsOtherReason } from '../../other-reason.utils';
import StockOperationReasonSelector from './stock-operation-reason-selector.component';

type StockOperationReasonFieldProps = {
  stockOperationType: string;
};

/**
 * The Reason field. It is the reasons dropdown, except that on an Adjustment or Disposal choosing
 * "Other" turns the field into a text box in which the reason can be typed. `reasonIsOther` is kept
 * in the form so that validation and submission know the text applies.
 */
const StockOperationReasonField: React.FC<StockOperationReasonFieldProps> = ({ stockOperationType }) => {
  const { t } = useTranslation();
  const { stockAdjustmentReasonUUID } = useConfig<ConfigObject>();
  const form = useFormContext<{ reasonUuid: string; reasonIsOther: boolean; otherReason: string }>();
  const supportsOtherReason = operationTypeSupportsOtherReason(stockOperationType);
  const {
    items: { answers: reasons },
  } = useConcept(supportsOtherReason ? stockAdjustmentReasonUUID : '');
  const reasonUuid = useWatch({ control: form.control, name: 'reasonUuid' });

  const selectedReason = reasons?.find((reason) => reason.uuid === reasonUuid);
  const isOtherReason = supportsOtherReason && isOtherReasonName(selectedReason?.display);

  const { setValue } = form;
  useEffect(() => {
    setValue('reasonIsOther', isOtherReason);
  }, [isOtherReason, setValue]);

  if (!isOtherReason) {
    return <StockOperationReasonSelector stockOperationType={stockOperationType} />;
  }

  return (
    <Controller
      control={form.control}
      name="otherReason"
      render={({ field, fieldState: { error } }) => (
        <TextInput
          {...field}
          value={field.value ?? ''}
          readOnly={field.disabled}
          autoFocus={!field.value}
          id="otherReason"
          labelText={t('reason', 'Reason')}
          placeholder={t('typeReasonPlaceholder', 'Type something...')}
          invalid={!!error?.message}
          invalidText={error?.message}
        />
      )}
    />
  );
};

export default StockOperationReasonField;
