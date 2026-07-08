import { renderHook } from '@testing-library/react';
import { UserRole } from '@zerologementvacant/models';
import {
  genEstablishmentDTO,
  genUserDTO
} from '@zerologementvacant/models/fixtures';
import type { PropsWithChildren } from 'react';
import { Provider } from 'react-redux';
import { describe, expect, it } from 'vitest';

import { useUser } from '~/hooks/useUser';
import { fromEstablishmentDTO } from '~/models/Establishment';
import { fromUserDTO } from '~/models/User';
import { MockAuthProvider } from '~/test/auth';
import configureTestStore from '~/utils/storeUtils';

describe('useUser', () => {
  it('falls back to the legacy Redux state when AuthProvider is not mounted', () => {
    const userDTO = { ...genUserDTO(), role: UserRole.ADMIN };
    const store = configureTestStore({
      auth: {
        user: fromUserDTO(userDTO),
        accessToken: 'fake-token',
        establishment: fromEstablishmentDTO(genEstablishmentDTO())
      }
    });
    const wrapper = ({ children }: PropsWithChildren) => (
      <Provider store={store}>{children}</Provider>
    );

    const { result } = renderHook(() => useUser(), { wrapper });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.isAdmin).toBe(true);
    expect(result.current.user?.email).toBe(userDTO.email);
  });

  it('does not throw when neither AuthProvider nor a legacy session is present', () => {
    const store = configureTestStore();
    const wrapper = ({ children }: PropsWithChildren) => (
      <Provider store={store}>{children}</Provider>
    );

    const { result } = renderHook(() => useUser(), { wrapper });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.isGuest).toBe(true);
  });

  it('sources from the cookie-backed session when AuthProvider is mounted', () => {
    const store = configureTestStore();
    const userDTO = { ...genUserDTO(), role: UserRole.USUAL };
    const establishment = genEstablishmentDTO();
    const wrapper = ({ children }: PropsWithChildren) => (
      <Provider store={store}>
        <MockAuthProvider
          options={{
            user: userDTO,
            establishment,
            effectiveGeoCodes: ['01001']
          }}
        >
          {children}
        </MockAuthProvider>
      </Provider>
    );

    const { result } = renderHook(() => useUser(), { wrapper });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.isUsual).toBe(true);
    expect(result.current.user?.email).toBe(userDTO.email);
    // EstablishmentDTO.siren (string) is projected to Establishment.siren (number).
    expect(typeof result.current.establishment?.siren).toBe('number');
    expect(result.current.effectiveGeoCodes).toEqual(['01001']);
  });
});
