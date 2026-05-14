import { act, render, screen, waitFor } from '@testing-library/react';
import { RequireServiceOnline } from './RequireServiceOnline';

describe('RequireServiceOnline', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    global.fetch = originalFetch;
  });

  it('shows the connecting loading state before the health check resolves', () => {
    global.fetch = jest.fn().mockReturnValue(new Promise(() => {})) as unknown as typeof fetch;

    render(
      <RequireServiceOnline serviceName="Harvest Service" healthUrl="/health">
        <p>child</p>
      </RequireServiceOnline>
    );

    const indicator = screen.getByTestId('service-loading');
    expect(indicator).toHaveAttribute('data-status', 'loading');
    expect(screen.getByText(/connecting to harvest service/i)).toBeInTheDocument();
    expect(screen.queryByText('child')).not.toBeInTheDocument();
  });

  it('renders children once the health check returns ok', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue({ ok: true } as Response) as unknown as typeof fetch;

    render(
      <RequireServiceOnline serviceName="Harvest Service" healthUrl="/health">
        <p>child</p>
      </RequireServiceOnline>
    );

    await waitFor(() => expect(screen.getByText('child')).toBeInTheDocument());
    expect(screen.queryByTestId('service-loading')).not.toBeInTheDocument();
  });

  it('shows the offline state when the health check fails and retries on the interval', async () => {
    const fetchMock = jest
      .fn()
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce({ ok: false, status: 503 } as Response)
      .mockResolvedValue({ ok: true } as Response);
    global.fetch = fetchMock as unknown as typeof fetch;

    render(
      <RequireServiceOnline
        serviceName="Harvest Service"
        healthUrl="/health"
        pollIntervalMs={1000}
      >
        <p>child</p>
      </RequireServiceOnline>
    );

    await waitFor(() =>
      expect(screen.getByTestId('service-loading')).toHaveAttribute('data-status', 'offline')
    );
    expect(screen.getByText(/harvest service is offline/i)).toBeInTheDocument();

    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    await waitFor(() =>
      expect(screen.getByTestId('service-loading')).toHaveAttribute('data-status', 'offline')
    );

    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    await waitFor(() => expect(screen.getByText('child')).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('stops polling after unmount', async () => {
    const fetchMock = jest.fn().mockRejectedValue(new Error('boom'));
    global.fetch = fetchMock as unknown as typeof fetch;

    const { unmount } = render(
      <RequireServiceOnline
        serviceName="Harvest Service"
        healthUrl="/health"
        pollIntervalMs={500}
      >
        <p>child</p>
      </RequireServiceOnline>
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    unmount();
    fetchMock.mockClear();
    await act(async () => {
      jest.advanceTimersByTime(5000);
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('ignores a resolved fetch that returns after unmount', async () => {
    let resolveFetch: (value: Response) => void = () => {};
    const pending = new Promise<Response>((resolve) => {
      resolveFetch = resolve;
    });
    global.fetch = jest.fn().mockReturnValue(pending) as unknown as typeof fetch;

    const { unmount } = render(
      <RequireServiceOnline serviceName="Harvest Service" healthUrl="/health">
        <p>child</p>
      </RequireServiceOnline>
    );

    unmount();
    await act(async () => {
      resolveFetch({ ok: false, status: 500 } as Response);
    });
    expect(screen.queryByText('child')).not.toBeInTheDocument();
  });
});
