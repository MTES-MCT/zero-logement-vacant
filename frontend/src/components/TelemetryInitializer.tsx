import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router';

import { startTelemetryWhenSafe } from '~/utils/telemetry';

export default function TelemetryInitializer() {
  const { hash, pathname } = useLocation();

  useEffect(() => {
    startTelemetryWhenSafe({ hash, pathname });
  }, [hash, pathname]);

  return <Outlet />;
}
