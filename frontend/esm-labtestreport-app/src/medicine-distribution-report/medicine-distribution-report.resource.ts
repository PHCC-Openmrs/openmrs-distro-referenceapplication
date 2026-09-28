import { openmrsFetch } from '@openmrs/esm-framework';
import useSWR from 'swr';

export interface MedicineDistributionRow {
  patientId: number;
  patientUuid: string;
  givenName: string;
  middleName: string;
  familyName: string;
  orderId: number;
  dateActivated: string;
  location: string | null;
  age: number | null;
  gender: string | null;
  nationalId: string | null;
  drugId: number | null;
  drugName: string | null;
  dose: number | null;
  doseUnits: string | null;
  frequency: string | null;
  route: string | null;
  duration: number | null;
  durationUnits: string | null;
  quantityPrescribed: number | null;
  quantityUnits: string | null;
  asNeeded: boolean | null;
  dosingInstructions: string | null;
  /** Sum of every Completed hand-over for this order, or null if nothing has been dispensed yet. */
  quantityDispensed: number | null;
  /** Status of the most recent dispense (Completed, On hold, Refused...), or null if pharmacy has not acted yet. */
  dispenseStatus: string | null;
  prescriber: string | null;
}

export function useMedicineDistributionReport(startDate?: string, endDate?: string, locationUuid?: string) {
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
  const url = `/module/labtestreport/api/medicine-distribution-report.json${query ? `?${query}` : ''}`;
  const { data, error, isLoading } = useSWR<{ data: MedicineDistributionRow[] }, Error>(url, openmrsFetch, {
    revalidateOnFocus: true,
  });
  return { rows: data?.data ?? [], error, isLoading };
}
