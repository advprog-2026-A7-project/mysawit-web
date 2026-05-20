/** @jest-environment node */

import { harvestService } from './harvest.service';
import { API_ENDPOINTS } from '@/lib/api-config';

jest.mock('@/lib/api-client', () => ({
  apiClient: {
    get: jest.fn(),
    patch: jest.fn(),
  },
}));

describe('harvest.service (node)', () => {
  it('creates harvest multipart data without a browser auth token', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ message: 'created', id: 'h-node' }),
    });
    global.fetch = fetchMock;

    const photo = new Blob(['photo'], { type: 'image/jpeg' }) as File;

    await harvestService.create({ plantationId: 1, weight: 10, files: [photo] });

    expect(fetchMock).toHaveBeenCalledWith(
      API_ENDPOINTS.HARVESTS.BASE,
      expect.objectContaining({
        method: 'POST',
        headers: {},
        body: expect.any(FormData),
      })
    );
  });
});
