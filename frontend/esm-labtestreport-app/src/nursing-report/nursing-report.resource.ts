import { openmrsFetch } from '@openmrs/esm-framework';
import useSWR from 'swr';

export interface NursingReportRow {
  patientId: number;
  patientUuid: string;
  givenName: string;
  middleName: string;
  familyName: string;
  encounterId: number;
  encounterDatetime: string;
  location: string | null;
  age: number | null;
  gender: string | null;
  typeOfWound: string | null;
  /** Every ointment applied at this encounter, comma-separated -- the form allows more than one. */
  ointments: string | null;
  dressingGeneralNotes: string | null;
  spirometry: number | null;
  monofilament: number | null;
  imInjection: string | null;
  ivInjection: string | null;
  oral: string | null;
  nebulization: string | null;
  /** UUID of the ECG attachment recorded at this encounter, or null if no ECG was uploaded. */
  ecgAttachmentUuid: string | null;
}

export function useNursingReport(startDate?: string, endDate?: string, locationUuid?: string) {
  const search = new URLSearchParams();
  if (startDate) {
    search.set('startDate', startDate);
  }
  if (endDate) {
    search.set('endDate', endDate);
  }
  if (locationUuid) {
    search.set('locationUuid', locationUuid);
  }
  const query = search.toString();
  const url = `/module/labtestreport/api/nursing-report.json${query ? `?${query}` : ''}`;
  const { data, error, isLoading } = useSWR<{ data: NursingReportRow[] }, Error>(url, openmrsFetch, {
    revalidateOnFocus: true,
  });
  return { rows: data?.data ?? [], error, isLoading };
}
