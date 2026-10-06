import { openmrsFetch } from '@openmrs/esm-framework';
import useSWR from 'swr';

export interface HealthPromotionRow {
  patientId: number;
  patientUuid: string;
  givenName: string;
  middleName: string;
  familyName: string;
  encounterId: number;
  encounterDatetime: string;
  /** The facility the form was submitted from, i.e. the encounter's own location. */
  location: string | null;
  participantName: string | null;
  age: number | null;
  gender: string | null;
  nationalId: string | null;
  phoneNumber: string | null;
  /** The patient's own address, not a form field. */
  fullAddress: string | null;
  governorate: string | null;
  neighborhood: string | null;
  sessionDate: string | null;
  sessionType: string | null;
  topic: string | null;
  chwName: string | null;
  notes: string | null;
}

export function useHealthPromotionReport(startDate?: string, endDate?: string, locationUuid?: string) {
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
  const url = `/module/labtestreport/api/health-promotion-report.json${query ? `?${query}` : ''}`;
  const { data, error, isLoading } = useSWR<{ data: HealthPromotionRow[] }, Error>(url, openmrsFetch, {
    revalidateOnFocus: true,
  });
  return { rows: data?.data ?? [], error, isLoading };
}
