import { createTelemetryStarter } from '../telemetry';

describe('Telemetry lifecycle', () => {
  it('should start once navigation leaves an unprotected password-reset URL', () => {
    const initialize = vi.fn();
    const startWhenSafe = createTelemetryStarter(initialize);

    expect(
      startWhenSafe({
        pathname: '/mot-de-passe/nouveau',
        hash: '#private-reset-token'
      })
    ).toBe(false);
    expect(initialize).not.toHaveBeenCalled();

    expect(startWhenSafe({ pathname: '/connexion', hash: '' })).toBe(true);
    expect(startWhenSafe({ pathname: '/', hash: '' })).toBe(true);
    expect(initialize).toHaveBeenCalledTimes(1);
  });
});
