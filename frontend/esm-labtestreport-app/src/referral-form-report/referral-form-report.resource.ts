import { openmrsFetch } from '@openmrs/esm-framework';
import useSWR from 'swr';

export interface ReferralFormRow {
  patientId: number;
  patientUuid: string;
  givenName: string;
  familyName: string;
  encounterId: number;
  encounterDatetime: string;
  location: string | null;
  fullName: string | null;
  age: number | null;
  gender: string | null;
  referralDate: string | null;
  referralTime: string | null;
  nationalId: string | null;
  phoneNumber: string | null;
  referringFacility: string | null;
  referredTo: string | null;
  urgency: string | null;
  transportation: string | null;
  referralCause: string | null;
  clinicalHistory: string | null;
  managementReceived: string | null;
  referringDoctor: string | null;
  headOfClinic: string | null;
  feedback: string | null;
  followUp: string | null;
  treatingDoctor: string | null;
}

export function useReferralFormReport(startDate?: string, endDate?: string) {
  const search = new URLSearchParams();
  if (startDate) {
    search.set('startDate', startDate);
  }
  if (endDate) {
    search.set('endDate', endDate);
  }
  const query = search.toString();
  const url = `/module/labtestreport/api/referral-form-report.json${query ? `?${query}` : ''}`;
  const { data, error, isLoading } = useSWR<{ data: ReferralFormRow[] }, Error>(url, openmrsFetch, {
    revalidateOnFocus: true,
  });
  return { rows: data?.data ?? [], error, isLoading };
}
