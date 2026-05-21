import { Shipment, ShipmentStatus } from '@/types';

export const shipmentStatusLabel: Partial<Record<ShipmentStatus, string>> = {
  MEMUAT: 'Memuat',
  MENGIRIM: 'Dalam Perjalanan',
  TIBA: 'Tiba di Tujuan',
  MANDOR_APPROVED: 'Disetujui Mandor',
  MANDOR_REJECTED: 'Ditolak Mandor',
  ADMIN_APPROVED: 'Disetujui',
  ADMIN_REJECTED: 'Ditolak Admin',
  PARTIALLY_REJECTED: 'Perlu Koreksi',
};

export const shipmentStatusBadge: Partial<Record<ShipmentStatus, string>> = {
  MEMUAT: 'badge-yellow',
  MENGIRIM: 'badge-blue',
  TIBA: 'badge-purple',
  MANDOR_APPROVED: 'badge-green',
  MANDOR_REJECTED: 'badge-red',
  ADMIN_APPROVED: 'badge-green',
  ADMIN_REJECTED: 'badge-red',
  PARTIALLY_REJECTED: 'badge-orange',
};

export const formatShipmentStatus = (status: ShipmentStatus) => shipmentStatusLabel[status] || status;

export const getShipmentWeight = (shipment: Shipment) => shipment.totalKg ?? shipment.weight ?? 0;

export const formatKg = (value: number): string =>
  `${value.toLocaleString('id-ID', { maximumFractionDigits: 2 })} kg`;

export const formatDateTime = (value?: string): string => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};

export const getShortId = (id: Shipment['id']) => String(id).slice(0, 8);

export const getWorkerDisplay = (name?: string, userId?: Shipment['supirUserId'], fallback = '-') =>
  name || (userId ? fallback : '-');

export const progressStatuses: ShipmentStatus[] = ['MEMUAT', 'MENGIRIM', 'TIBA', 'MANDOR_APPROVED', 'ADMIN_APPROVED'];

export const isRejectedStatus = (status: ShipmentStatus) =>
  status === 'MANDOR_REJECTED' || status === 'ADMIN_REJECTED' || status === 'PARTIALLY_REJECTED';

export const getProgressState = (shipmentStatus: ShipmentStatus, stepStatus: ShipmentStatus) => {
  if (isRejectedStatus(shipmentStatus)) return 'progress-step-rejected';

  const currentIndex = progressStatuses.indexOf(shipmentStatus);
  const stepIndex = progressStatuses.indexOf(stepStatus);

  if (currentIndex >= stepIndex && currentIndex !== -1) return 'progress-step-active';
  return 'progress-step-inactive';
};
