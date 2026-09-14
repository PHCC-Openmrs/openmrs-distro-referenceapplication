import { openmrsFetch } from '@openmrs/esm-framework';
import useSWR from 'swr';

/** The three SRH sections, each recorded as its own encounter type. */
export type SrhSection = 'ultrasound' | 'stiGynaecology' | 'familyPlanning';

/**
 * An SRH encounter belongs to exactly one section, so only that section's fields are populated on
 * any given row -- `section` says which.
 */
export interface SrhReportRow {
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
  section: SrhSection;
  // Ultrasound
  fetuses: string | null;
  fetalHeartPulsation: string | null;
  presentation: string | null;
  lieFetuses: string | null;
  fetalGender: string | null;
  femurLength: number | null;
  crownRumpLength: number | null;
  biparietalDiameter: number | null;
  abdominalCircumference: number | null;
  gestationalAgeWeeks: number | null;
  gestationalAgeDays: number | null;
  placenta: string | null;
  amnioticFluid: string | null;
  expectedDateOfDelivery: string | null;
  weeksSinceLmp: number | null;
  referrals: string | null;
  ultrasoundNotes: string | null;
  // STI and Gynaecology
  pncTiming: string | null;
  sti: string | null;
  gynaecology: string | null;
  preConceptionCare: string | null;
  stiGynaecologyNotes: string | null;
  // Family Planning
  familyPlanningVisitType: string | null;
  contraceptionKind: string | null;
  familyPlanningNotes: string | null;
}

export function useSrhReport(startDate?: string, endDate?: string, locationUuid?: string, section?: SrhSection) {
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
  if (section) {
    search.set('section', section);
  }
  const query = search.toString();
  const url = `/module/labtestreport/api/srh-report.json${query ? `?${query}` : ''}`;
  const { data, error, isLoading } = useSWR<{ data: SrhReportRow[] }, Error>(url, openmrsFetch, {
    revalidateOnFocus: true,
  });
  return { rows: data?.data ?? [], error, isLoading };
}
