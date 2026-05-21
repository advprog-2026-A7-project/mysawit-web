import type { Shipment } from '@/types';
import {
  formatDateTime,
  formatKg,
  formatShipmentStatus,
  getProgressState,
  getShipmentWeight,
  getShortId,
  getWorkerDisplay,
  isRejectedStatus,
  progressStatuses,
  shipmentStatusBadge,
} from './shipment';

const baseShipment: Shipment = {
  id: 'shipment-123456789',
  destination: 'Pabrik Sawit',
  status: 'MEMUAT',
  createdAt: '2026-05-21T00:00:00.000Z',
  updatedAt: '2026-05-21T00:00:00.000Z',
};

describe('shipment utilities', () => {
  it('formats known and fallback shipment statuses', () => {
    expect(formatShipmentStatus('MENGIRIM')).toBe('Dalam Perjalanan');
    expect(formatShipmentStatus('PENDING')).toBe('PENDING');
    expect(shipmentStatusBadge.ADMIN_REJECTED).toBe('badge-red');
  });

  it('uses totalKg before legacy weight when calculating shipment weight', () => {
    expect(getShipmentWeight({ ...baseShipment, totalKg: 125.5, weight: 99 })).toBe(125.5);
    expect(getShipmentWeight({ ...baseShipment, weight: 80 })).toBe(80);
    expect(getShipmentWeight(baseShipment)).toBe(0);
  });

  it('formats weight using Indonesian number formatting', () => {
    expect(formatKg(1250.5)).toBe('1.250,5 kg');
  });

  it('formats date values and preserves empty or invalid inputs', () => {
    const toLocaleStringSpy = jest
      .spyOn(Date.prototype, 'toLocaleString')
      .mockReturnValue('21 Mei 2026 pukul 15.30');

    expect(formatDateTime()).toBe('-');
    expect(formatDateTime('not-a-date')).toBe('not-a-date');
    expect(formatDateTime('2026-05-21T08:30:00.000Z')).toBe('21 Mei 2026 pukul 15.30');
    expect(toLocaleStringSpy).toHaveBeenCalledWith('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    toLocaleStringSpy.mockRestore();
  });

  it('formats ids and worker display names', () => {
    expect(getShortId(baseShipment.id)).toBe('shipment');
    expect(getWorkerDisplay('Budi', 12)).toBe('Budi');
    expect(getWorkerDisplay(undefined, 12, 'Belum ditugaskan')).toBe('Belum ditugaskan');
    expect(getWorkerDisplay()).toBe('-');
  });

  it('describes shipment progress states', () => {
    expect(progressStatuses).toEqual(['MEMUAT', 'MENGIRIM', 'TIBA', 'MANDOR_APPROVED', 'ADMIN_APPROVED']);
    expect(isRejectedStatus('MANDOR_REJECTED')).toBe(true);
    expect(isRejectedStatus('ADMIN_REJECTED')).toBe(true);
    expect(isRejectedStatus('PARTIALLY_REJECTED')).toBe(true);
    expect(isRejectedStatus('MEMUAT')).toBe(false);

    expect(getProgressState('MANDOR_REJECTED', 'MEMUAT')).toBe('progress-step-rejected');
    expect(getProgressState('TIBA', 'MENGIRIM')).toBe('progress-step-active');
    expect(getProgressState('MEMUAT', 'TIBA')).toBe('progress-step-inactive');
    expect(getProgressState('PENDING', 'MEMUAT')).toBe('progress-step-inactive');
  });
});
