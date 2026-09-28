import { openmrsFetch, useSession } from '@openmrs/esm-framework';
import useSWR, { mutate } from 'swr';

export type NotificationType =
  | 'LAB_RESULT'
  | 'LAB_ORDER'
  | 'MEDICATION_ORDER'
  | 'PATIENT_REGISTERED'
  | 'PATIENT_QUEUED'
  | 'STOCK_OPERATION'
  | 'LOW_STOCK'
  | 'STOCK_EXPIRY'
  | 'GENERAL';

export interface Notification {
  id: number;
  type: NotificationType;
  message: string;
  /** uuid of the order, encounter, patient, queue entry or stock operation it is about */
  referenceUuid: string | null;
  patientUuid: string | null;
  /** epoch millis */
  dateCreated: number;
}

const notificationsUrl = '/module/labtestreport/api/notifications.json';

/** How often the bell re-checks for new notifications. */
const POLL_INTERVAL_MS = 60_000;

/**
 * The logged-in user's unread notifications for their session location (the server filters by it).
 * The navbar button and the panel both call this, and share one SWR cache entry, so marking a
 * notification read updates both. The location is part of the key so switching location refetches.
 */
export function useNotifications() {
  const session = useSession();
  const { data, error, isLoading } = useSWR<{ data: Array<Notification> }, Error>(
    [notificationsUrl, session?.sessionLocation?.uuid],
    ([url]) => openmrsFetch(url),
    { refreshInterval: POLL_INTERVAL_MS },
  );
  return { notifications: data?.data ?? [], error, isLoading };
}

const refreshNotifications = () => mutate((key) => Array.isArray(key) && key[0] === notificationsUrl);

export async function markNotificationRead(notificationId: number) {
  await openmrsFetch(`/ws/rest/v1/labtestreport/notifications/${notificationId}/read`, { method: 'POST' });
  await refreshNotifications();
}

export async function markAllNotificationsRead() {
  await openmrsFetch('/ws/rest/v1/labtestreport/notifications/readAll', { method: 'POST' });
  await refreshNotifications();
}

/** The page a click on the notification opens, or null when there is nowhere useful to go. */
export function getNotificationLink(notification: Notification): string | null {
  const patient = notification.patientUuid;
  switch (notification.type) {
    case 'LAB_RESULT':
      return patient ? `\${openmrsSpaBase}/patient/${patient}/chart/results` : null;
    case 'PATIENT_REGISTERED':
      return patient ? `\${openmrsSpaBase}/patient/${patient}/chart` : null;
    case 'LAB_ORDER':
      return '${openmrsSpaBase}/home/laboratory';
    case 'MEDICATION_ORDER':
      return '${openmrsSpaBase}/dispensing';
    case 'PATIENT_QUEUED':
      return '${openmrsSpaBase}/home/service-queues';
    case 'STOCK_OPERATION':
      return '${openmrsSpaBase}/stock-management/operations';
    case 'LOW_STOCK':
    case 'STOCK_EXPIRY':
      return '${openmrsSpaBase}/stock-management';
    default:
      return null;
  }
}
