import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  TextInput,
} from '@carbon/react';
import { Add, Save, TrashCan } from '@carbon/react/icons';
import { Controller, FormProvider, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { restBaseUrl, showSnackbar } from '@openmrs/esm-framework';
import { useStockItemReferencesHook } from './stock-item-references.resource';
import { type StockItemReferenceDraft, type StockItemReferenceFormData } from './validation-schema';
import { type StockItemReferenceDTO } from '../../../core/api/types/stockItem/StockItemReference';
import { createStockItemReference, deleteStockItemReference } from '../../stock-items.resource';
import { extractErrorMessagesFromResponse } from '../../../constants';
import { useHandleMutate } from '../../../utils';
import StockSourceSelector from './stock-references-selector.component';
import StockItemPackagingUnitSelector from './stock-item-packaging-unit-selector.component';
import { type CustomTableHeader, type CustomTableRow } from '../../../core/components/table/types';
import styles from './stock-item-references.scss';

interface StockReferencesProps {
  isEditing?: boolean;
  onSubmit?: () => void;
  stockItemUuid: string;
}

const REFERENCES_URL = `${restBaseUrl}/stockmanagement/stockitemreference`;

const emptyDraft = (): StockItemReferenceDraft => ({ source: null, code: '', packagingUnit: null });

const referenceKey = (source: string | null | undefined, code: string | null | undefined) =>
  `${source ?? ''}|${(code ?? '').trim().toLowerCase()}`;

interface DraftProblems {
  missingSource: boolean;
  missingCode: boolean;
  duplicate: boolean;
}

// A vendor (Source) can supply the same item under several codes and pack sizes, so the tab keeps
// any number of new "draft" rows alongside the saved references and creates them all on Save.
const StockReferences: React.FC<StockReferencesProps> = ({ stockItemUuid }) => {
  const { t } = useTranslation();
  const handleMutate = useHandleMutate();

  const { items, isLoading, setStockItemUuid } = useStockItemReferencesHook();
  useEffect(() => {
    setStockItemUuid(stockItemUuid);
  }, [stockItemUuid, setStockItemUuid]);

  const savedReferences = useMemo(() => items ?? [], [items]);

  const form = useForm<StockItemReferenceFormData>({ defaultValues: { drafts: [] } });
  const { control } = form;
  const { fields, append, remove } = useFieldArray({ control, name: 'drafts' });
  const watchedDrafts = useWatch({ control, name: 'drafts' });
  const drafts = useMemo(() => watchedDrafts ?? [], [watchedDrafts]);

  const [isSaving, setIsSaving] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  // Start with one blank row when the item has no references yet, so the empty tab still invites input.
  const initialisedRef = useRef(false);
  useEffect(() => {
    if (!isLoading && !initialisedRef.current && stockItemUuid) {
      initialisedRef.current = true;
      if (savedReferences.length === 0) {
        append(emptyDraft());
      }
    }
  }, [isLoading, savedReferences.length, stockItemUuid, append]);

  // Source + code is unique in the backend, so flag a draft that repeats a saved reference or another draft.
  const draftProblems = useMemo<DraftProblems[]>(() => {
    const savedKeys = new Set(savedReferences.map((ref) => referenceKey(ref.stockSourceUuid, ref.referenceCode)));
    const draftKeyCounts = new Map<string, number>();
    drafts.forEach((draft) => {
      if (draft?.source && draft?.code?.trim()) {
        const key = referenceKey(draft.source, draft.code);
        draftKeyCounts.set(key, (draftKeyCounts.get(key) ?? 0) + 1);
      }
    });
    return drafts.map((draft) => {
      const hasSource = Boolean(draft?.source);
      const hasCode = Boolean(draft?.code?.trim());
      const key = referenceKey(draft?.source, draft?.code);
      return {
        missingSource: !hasSource,
        missingCode: !hasCode,
        duplicate: hasSource && hasCode && (savedKeys.has(key) || (draftKeyCounts.get(key) ?? 0) > 1),
      };
    });
  }, [drafts, savedReferences]);

  const tableHeaders = useMemo<CustomTableHeader[]>(
    () => [
      { key: 'source', header: t('source', 'Source'), styles: { width: '35%' } },
      { key: 'code', header: t('code', 'Code'), styles: { width: '25%' } },
      { key: 'packSize', header: t('packSize', 'Pack Size'), styles: { width: '30%' } },
      { key: 'action', header: t('action', 'Actions'), styles: { width: '10%' } },
    ],
    [t],
  );

  const handleDelete = (reference: StockItemReferenceDTO) => {
    deleteStockItemReference(reference.uuid).then(
      () => {
        handleMutate(REFERENCES_URL);
        showSnackbar({
          title: t('deleteStockItemReference', 'Delete stock item reference'),
          kind: 'success',
          subtitle: t('deleteStockItemReferenceMessage', 'Stock item reference deleted successfully'),
        });
      },
      (error) => {
        const err = extractErrorMessagesFromResponse(error);
        showSnackbar({
          title: t('deleteStockItemReferenceTitle', 'Error deleting a stock item reference'),
          kind: 'error',
          subtitle: err.join(', '),
        });
      },
    );
  };

  const handleSave = async () => {
    const currentDrafts = form.getValues('drafts');
    if (currentDrafts.length === 0) {
      return;
    }

    const hasProblems = draftProblems.some((p) => p.missingSource || p.missingCode || p.duplicate);
    if (hasProblems) {
      setShowErrors(true);
      const hasDuplicate = draftProblems.some((p) => p.duplicate);
      showSnackbar({
        title: t('saveReferenceTitle', 'Stock Item Reference'),
        subtitle: hasDuplicate
          ? t('duplicateStockItemReference', 'This source already has a reference with the same code.')
          : t(
              'incompleteStockItemReference',
              'Select a source and enter a code for each new reference, or remove the row.',
            ),
        kind: 'error',
      });
      return;
    }

    setIsSaving(true);
    const results = await Promise.allSettled(
      currentDrafts.map((draft) =>
        createStockItemReference({
          referenceCode: draft.code.trim(),
          stockItemUuid,
          stockSourceUuid: draft.source,
          packagingUnitUuid: draft.packagingUnit || null,
        }),
      ),
    );
    setIsSaving(false);

    const savedIndexes = results.flatMap((result, index) => (result.status === 'fulfilled' ? [index] : []));
    const failures = results.flatMap((result) => (result.status === 'rejected' ? [result.reason] : []));

    // Drop the rows that were created; failed rows stay so the user can correct and retry them.
    remove(savedIndexes);
    handleMutate(REFERENCES_URL);

    if (savedIndexes.length > 0) {
      showSnackbar({
        title: t('saveReferenceTitle', 'Stock Item Reference'),
        subtitle: t('saveStockItemReferencesMessage', '{{number}} reference(s) saved successfully', {
          number: savedIndexes.length,
        }),
        kind: 'success',
      });
    }
    if (failures.length > 0) {
      // The REST layer wraps server messages in brackets, e.g. "[Code X from Y is already used by Z.]".
      const messages = failures
        .flatMap((error) => extractErrorMessagesFromResponse(error))
        .map((message) => (typeof message === 'string' ? message.replace(/^\[(.*)\]$/s, '$1') : message));
      showSnackbar({
        title: t('saveStockItemReferenceErrorTitle', 'Stock Item Reference'),
        subtitle: t('saveStockItemReferencesErrorMessage', '{{number}} reference(s) could not be saved: {{errors}}', {
          number: failures.length,
          errors: messages.join(', '),
        }),
        kind: 'error',
      });
    }
    if (failures.length === 0) {
      setShowErrors(false);
    }
  };

  if (isLoading) return <DataTableSkeleton showHeader={false} rowCount={5} columnCount={4} zebra />;

  return (
    <FormProvider {...form}>
      <DataTable
        rows={
          [
            ...savedReferences.map((item, idx) => ({ ...item, id: item.uuid || `ref-${idx}` })),
            ...fields.map((field) => ({ id: field.id })),
          ] as CustomTableRow[]
        }
        headers={tableHeaders as any}
        isSortable={false}
        useZebraStyles
      >
        {({ headers, getHeaderProps, getTableProps }) => (
          <TableContainer className={styles.referencesTableContainer}>
            <Table {...getTableProps()} className={styles.referencesTable}>
              <TableHead>
                <TableRow>
                  {headers.map((header) => {
                    const customHeader = header as CustomTableHeader;
                    return (
                      <TableHeader
                        {...getHeaderProps({ header, isSortable: false })}
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
                </TableRow>
              </TableHead>
              <TableBody className={styles.referencesTableBody}>
                {savedReferences.map((reference) => (
                  <TableRow key={reference.uuid}>
                    <TableCell>{reference.stockSourceName}</TableCell>
                    <TableCell>{reference.referenceCode}</TableCell>
                    <TableCell>
                      {reference.packagingUnitName
                        ? reference.packagingUnitFactor
                          ? `${reference.packagingUnitName} - ${reference.packagingUnitFactor}`
                          : reference.packagingUnitName
                        : ''}
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        size="sm"
                        kind="ghost"
                        hasIconOnly
                        className="clear-padding-margin"
                        iconDescription={t('delete', 'Delete')}
                        renderIcon={TrashCan}
                        onClick={() => handleDelete(reference)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
                {fields.map((field, index) => {
                  const problems = draftProblems[index];
                  return (
                    <TableRow key={field.id}>
                      <TableCell>
                        <StockSourceSelector
                          name={`reference-source-${field.id}`}
                          controllerName={`drafts.${index}.source`}
                          control={control as any}
                          placeholder={t('filter', 'Filter...')}
                          invalid={showErrors && (problems?.missingSource || problems?.duplicate)}
                        />
                      </TableCell>
                      <TableCell>
                        <Controller
                          name={`drafts.${index}.code`}
                          control={control}
                          render={({ field: { onChange, value, ref } }) => (
                            <TextInput
                              id={`reference-code-${field.id}`}
                              labelText=""
                              size="md"
                              value={value ?? ''}
                              ref={ref}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
                              invalid={showErrors && (problems?.missingCode || problems?.duplicate)}
                            />
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        <StockItemPackagingUnitSelector
                          stockItemUuid={stockItemUuid}
                          name={`reference-packaging-unit-${field.id}`}
                          controllerName={`drafts.${index}.packagingUnit`}
                          control={control as any}
                          placeholder={t('filter', 'Filter...')}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          size="sm"
                          kind="ghost"
                          hasIconOnly
                          className="clear-padding-margin"
                          iconDescription={t('remove', 'Remove')}
                          renderIcon={TrashCan}
                          onClick={() => remove(index)}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DataTable>

      <Button kind="ghost" renderIcon={Add} onClick={() => append(emptyDraft())}>
        {t('addReference', 'Add reference')}
      </Button>

      <div className={styles.referencesActions}>
        <Button
          name="save"
          type="submit"
          className="submitButton"
          onClick={handleSave}
          kind="primary"
          renderIcon={Save}
          disabled={fields.length === 0 || isSaving}
        >
          {t('save', 'Save')}
        </Button>
      </div>
    </FormProvider>
  );
};

export default StockReferences;
