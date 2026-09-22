import React, { type ReactNode, useMemo, useState } from 'react';
import { ComboBox, InlineLoading, TextInputSkeleton } from '@carbon/react';
import { type Control, Controller, type FieldValues } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import useSWR from 'swr';
import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import { useDebounce } from '../../../core/hooks/debounce-hook';

// This selector is only ever used for Non Pharmaceuticals stock items (Pharmaceuticals use
// DrugSelector, hitting /drug, instead). It hits the custom /non-drug resource, which mirrors
// /drug's shape but lists concepts of the classes configured in the
// stockmanagement.nonDrugItemConceptClasses global property (default "Medical supply"), plus any
// item curated as an answer of the "Non-drug" bucket concept under "Stock item category"
// (8ccf6066-9297-4d76-aaf3-00aa3714d198).
interface NonDrugItem {
  uuid: string;
  display: string;
}

interface ConceptsSelectorProps<T> {
  conceptUuid?: string;
  control: Control<FieldValues, T>;
  controllerName: string;
  invalid?: boolean;
  invalidText?: ReactNode;
  name: string;
  onConceptUuidChange?: (unit: NonDrugItem) => void;
  placeholder?: string;
  title?: string;
}

const ConceptsSelector = <T,>(props: ConceptsSelectorProps<T>) => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<NonDrugItem | null>(null);

  const url = `${restBaseUrl}/non-drug?v=default&limit=500${
    searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ''
  }`;
  // keepPreviousData keeps the last result list on screen while a new search is in flight, so the
  // ComboBox is never unmounted mid-typing (that would throw away the typed text and the focus).
  const { data, isLoading } = useSWR<{ data: { results: Array<NonDrugItem> } }>(url, openmrsFetch, {
    keepPreviousData: true,
  });
  const items = useMemo(() => data?.data.results ?? [], [data]);

  // Keep the picked item in the list even when the current search results no longer contain it,
  // otherwise Carbon has nothing to match and silently blanks the field.
  const resolvedItems = useMemo(
    () => (selectedItem && !items.some((i) => i.uuid === selectedItem.uuid) ? [selectedItem, ...items] : items),
    [items, selectedItem],
  );

  const handleInputChange = useDebounce((query: string) => setSearchQuery(query), 500);

  // Only block the field before the very first page of items has ever arrived; after that we stay
  // mounted and show an inline spinner instead.
  if (isLoading && !data) {
    return <TextInputSkeleton />;
  }

  return (
    <div>
      <Controller
        control={props.control}
        name={props.controllerName}
        render={({ field: { onChange, value, ref } }) => (
          <ComboBox
            id={props.name}
            invalid={props.invalid}
            invalidText={props.invalidText}
            items={resolvedItems}
            itemToString={(item?: NonDrugItem) => item?.display ?? ''}
            name={props.name}
            onChange={(data: { selectedItem: NonDrugItem | null | undefined }) => {
              setSelectedItem(data.selectedItem ?? null);
              if (data.selectedItem) {
                props.onConceptUuidChange?.(data.selectedItem);
                onChange(data.selectedItem.uuid);
              } else {
                onChange('');
              }
            }}
            onInputChange={handleInputChange}
            placeholder={props.placeholder}
            ref={ref}
            selectedItem={resolvedItems.find((p) => p.uuid === value) ?? null}
            size="md"
            titleText={props.title}
          />
        )}
      />
      {isLoading && (
        <InlineLoading
          status="active"
          iconDescription={t('searching', 'Searching')}
          description={t('searchingEllipsis', 'Searching...')}
        />
      )}
    </div>
  );
};

export default ConceptsSelector;
