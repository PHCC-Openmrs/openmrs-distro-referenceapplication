import { openmrsFetch } from '@openmrs/esm-framework';
import useSWR from 'swr';

export type DiseaseActivityRowKind = 'DIAGNOSIS' | 'SUBTOTAL' | 'NOT_CAPTURED' | 'TOTAL';

/**
 * One line of the Primary Health Activity layout, in paper-template order. Diagnosis rows roll up
 * every diagnosis the PHCC mapping sheet lists under them; NOT_CAPTURED rows are template rows that
 * nothing in the system records yet; SUBTOTAL and TOTAL rows add up other rows.
 */
export interface DiseaseActivityRow {
  group: string;
  section: string | null;
  rowKey: string;
  number: string | null;
  label: string;
  kind: DiseaseActivityRowKind;
  counts: Record<string, number>;
  total: number;
  /** The diagnoses counted under this row (a subtotal lists its member rows' diagnoses), sorted by name. */
  diagnoses: Array<string>;
}

export interface DiseaseActivityReport {
  rows: Array<DiseaseActivityRow>;
}

export interface PatientRow {
  patientId: number;
  patientUuid: string;
  givenName: string;
  middleName?: string;
  familyName: string;
  identifier: string;
  sex: string;
  nationalId: string;
  phoneNumber: string;
}

export interface DiseaseDrilldownParams {
  rowKey: string;
  gender?: string;
  ageGroup?: string;
  startDate?: string;
  endDate?: string;
  locationUuid?: string;
}

function buildQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value));
    }
  });
  const query = search.toString();
  return query ? `?${query}` : '';
}

export function useDiseaseSummaryReport(
  startDate?: string,
  endDate?: string,
  locationUuid?: string,
  enabled: boolean = true,
) {
  const url = enabled
    ? `/module/labtestreport/api/disease-summary.json${buildQuery({ startDate, endDate, locationUuid })}`
    : null;
  const { data, error, isLoading } = useSWR<{ data: DiseaseActivityReport }, Error>(url, openmrsFetch);
  return { rows: data?.data?.rows ?? [], error, isLoading };
}

export function useDiseaseDrilldown(params: DiseaseDrilldownParams | null) {
  const url = params ? `/module/labtestreport/api/disease-drilldown.json${buildQuery({ ...params })}` : null;
  const { data, error, isLoading } = useSWR<{ data: PatientRow[] }, Error>(url, openmrsFetch);
  return { patients: data?.data ?? [], error, isLoading };
}
