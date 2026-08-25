import { openmrsFetch } from '@openmrs/esm-framework';
import useSWR from 'swr';

export interface NutritionSummaryRow {
  patientId: number;
  patientUuid: string;
  givenName: string;
  familyName: string;
  category: string | null;
  age: number | null;
  location: string | null;
  visitDate: string;
  visitCount: number;
  currentMuac: number | null;
  lastMuac: number | null;
  diagnosis: string | null;
  typeOfSupplement: string | null;
  supplementQuantity: number | null;
  nationalId: string | null;
  phoneNumber: string | null;
  project: string | null;
  status: string | null;
}

export type NutritionAgeBand = 'under5' | 'above5';

const ENDPOINT_BY_BAND: Record<NutritionAgeBand, string> = {
  under5: '/module/labtestreport/api/child-under-5-summary.json',
  above5: '/module/labtestreport/api/child-above-5-summary.json',
};

export function useNutritionSummaryReport(band: NutritionAgeBand, startDate?: string, endDate?: string) {
  const search = new URLSearchParams();
  if (startDate) {
    search.set('startDate', startDate);
  }
  if (endDate) {
    search.set('endDate', endDate);
  }
  const query = search.toString();
  const url = `${ENDPOINT_BY_BAND[band]}${query ? `?${query}` : ''}`;
  const { data, error, isLoading } = useSWR<{ data: NutritionSummaryRow[] }, Error>(url, openmrsFetch);
  return { rows: data?.data ?? [], error, isLoading };
}

export interface NutritionFilterOptions {
  locations: Array<string>;
  categories: Array<string>;
  diagnoses: Array<string>;
  supplementTypes: Array<string>;
  statuses: Array<string>;
}

const EMPTY_FILTER_OPTIONS: NutritionFilterOptions = {
  locations: [],
  categories: [],
  diagnoses: [],
  supplementTypes: [],
  statuses: [],
};

/**
 * Dropdown options sourced directly from the database (defined concept answers, unioned with
 * whatever has actually been recorded) rather than derived from whichever report rows happen to
 * be loaded - the latter is too sparse in practice to be useful as a filter's option list.
 */
export function useNutritionFilterOptions() {
  const url = '/module/labtestreport/api/nutrition-filter-options.json';
  const { data, error, isLoading } = useSWR<{ data: NutritionFilterOptions }, Error>(url, openmrsFetch);
  return { options: data?.data ?? EMPTY_FILTER_OPTIONS, error, isLoading };
}
