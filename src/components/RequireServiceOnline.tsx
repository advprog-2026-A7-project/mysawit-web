'use client';

import { useEffect, useState } from 'react';

type ServiceHealth = 'loading' | 'online' | 'offline';

interface RequireServiceOnlineProps {
  serviceName: string;
  healthUrl: string;
  children: React.ReactNode;
  pollIntervalMs?: number;
}

export function RequireServiceOnline({
  serviceName,
  healthUrl,
  children,
  pollIntervalMs = 3000,
}: RequireServiceOnlineProps) {
  const [status, setStatus] = useState<ServiceHealth>('loading');

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const probe = async () => {
      try {
        const res = await fetch(healthUrl, { cache: 'no-store' });
        if (cancelled) return;
        if (res.ok) {
          setStatus('online');
          return;
        }
        setStatus('offline');
      } catch {
        if (cancelled) return;
        setStatus('offline');
      }
      timer = setTimeout(probe, pollIntervalMs);
    };

    setStatus('loading');
    void probe();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [healthUrl, pollIntervalMs]);

  if (status === 'online') {
    return <>{children}</>;
  }

  const isOffline = status === 'offline';

  return (
    <div
      className="flex items-center justify-center py-20"
      role="status"
      aria-live="polite"
      aria-busy="true"
      data-testid="service-loading"
      data-status={status}
    >
      <div className="text-center">
        <div className="text-5xl text-gray-400 animate-pulse mb-4" aria-hidden>
          ●
        </div>
        <h2 className="text-2xl font-semibold text-gray-800 mb-2">
          {isOffline ? `${serviceName} is offline` : `Connecting to ${serviceName}…`}
        </h2>
        <p className="text-gray-600">
          {isOffline
            ? 'Retrying automatically. The page will load once the service is reachable.'
            : 'Checking service availability. Please wait.'}
        </p>
      </div>
    </div>
  );
}
