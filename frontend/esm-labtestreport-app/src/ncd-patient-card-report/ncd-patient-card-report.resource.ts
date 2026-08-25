import { openmrsFetch } from '@openmrs/esm-framework';
import useSWR from 'swr';

export interface NcdPatientCardRow {
  patientId: number;
  patientUuid: string;
  givenName: string;
  familyName: string;
  encounterId: number;
  encounterDatetime: string;
  location: string | null;
  fullName: string | null;
  fileNumber: string | null;
  dob: string | null;
  gender: string | null;
  phoneNumber: string | null;
  address: string | null;
  condition: string | null;
  conditionStart: string | null;
  status: string | null;
  followDate: string | null;
  bp: string | null;
  glucose: number | null;
  medication: string | null;
  nextFollow: string | null;
}

export function useNcdPatientCardReport(startDate?: string, endDate?: string) {
  const search = new URLSearchParams();
  if (startDate) {
    search.set('startDate', startDate);
  }
  if (endDate) {
    search.set('endDate', endDate);
  }
  const query = search.toString();
  const url = `/module/labtestreport/api/ncd-patient-card-report.json${query ? `?${query}` : ''}`;
  const { data, error, isLoading } = useSWR<{ data: NcdPatientCardRow[] }, Error>(url, openmrsFetch);
  return { rows: data?.data ?? [], error, isLoading };
}
