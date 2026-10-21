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
  nationalId: string | null;
  phoneNumber: string | null;
  typeOfWound: string | null;
  /** Every ointment applied at this encounter, comma-separated -- the form allows more than one. */
  ointments: string | null;
  dressingGeneralNotes: string | null;
  spirometry: number | null;
  monofilament: number | null;
  /** UUID of the ECG attachment recorded at this encounter, or null if no ECG was uploaded. */
  ecgAttachmentUuid: string | null;
  /** The drug and quantity given for each procedure, as recorded by the nursing form's dropdown and quantity fields. */
  imInjectionDrug: string | null;
  imInjectionQuantity: number | null;
  ivInjectionDrug: string | null;
  ivInjectionQuantity: number | null;
  oralDrug: string | null;
  oralQuantity: number | null;
  nebulizationDrug: string | null;
  nebulizationQuantity: number | null;
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
