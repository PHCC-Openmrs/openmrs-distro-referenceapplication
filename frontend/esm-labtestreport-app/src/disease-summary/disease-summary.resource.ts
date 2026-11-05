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
  /** Service-type program uuid; only diagnoses of patients enrolled in it that day count. */
  programUuid?: string;
}

/**
 * The four service types a visit can be opted into, each backed by a program. Must match the
 * service-type program uuids in the backend's queries (see patient_encounter_summary.sql).
 */
export const SERVICE_TYPES = [
  { uuid: 'bd6b8c0a-49c9-4f98-afea-8b8fcd999688', labelKey: 'serviceTypePrimaryHealth', label: 'Primary Health' },
  { uuid: 'f73376c9-7bdf-44e5-ba97-ddf4db5bc9f9', labelKey: 'serviceTypeSrh', label: 'SRH' },
  { uuid: '9138885e-f9f4-4981-b1fb-ef3d022228bd', labelKey: 'serviceTypePediatric', label: 'Pediatric' },
  { uuid: '2433ebba-8ffb-11f1-a103-1afee95a890c', labelKey: 'serviceTypeNutrition', label: 'Nutrition' },
] as const;

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
  programUuid?: string,
  enabled: boolean = true,
) {
  const url = enabled
    ? `/module/labtestreport/api/disease-summary.json${buildQuery({ startDate, endDate, locationUuid, programUuid })}`
    : null;
  const { data, error, isLoading } = useSWR<{ data: DiseaseActivityReport }, Error>(url, openmrsFetch);
  return { rows: data?.data?.rows ?? [], error, isLoading };
}

export function useDiseaseDrilldown(params: DiseaseDrilldownParams | null) {
  const url = params ? `/module/labtestreport/api/disease-drilldown.json${buildQuery({ ...params })}` : null;
  const { data, error, isLoading } = useSWR<{ data: PatientRow[] }, Error>(url, openmrsFetch);
  return { patients: data?.data ?? [], error, isLoading };
}
