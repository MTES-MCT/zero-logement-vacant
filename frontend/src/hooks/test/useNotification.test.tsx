import { render, screen, waitFor } from '@testing-library/react';

import Notification from '~/components/Notification/Notification';
import {
  useNotification,
  type NotificationProps
} from '~/hooks/useNotification';

function Harness(props: Readonly<NotificationProps>) {
  useNotification(props);
  return <Notification />;
}

describe('useNotification', () => {
  it('renders the loading toast as a polite status region', async () => {
    render(
      <Harness
        toastId="notif-loading"
        isLoading
        isError={false}
        isSuccess={false}
        message={{ loading: 'Chargement…' }}
      />
    );

    const status = await screen.findByRole('status');

    expect(status).toHaveTextContent('Chargement…');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('renders the success toast as a polite status region', async () => {
    const { rerender } = render(
      <Harness
        toastId="notif-success"
        isLoading
        isError={false}
        isSuccess={false}
        message={{ loading: 'Chargement…', success: 'Enregistré' }}
      />
    );
    await screen.findByText('Chargement…');

    rerender(
      <Harness
        toastId="notif-success"
        isLoading={false}
        isError={false}
        isSuccess
        message={{ loading: 'Chargement…', success: 'Enregistré' }}
      />
    );

    const status = await screen.findByRole('status');
    await waitFor(() => expect(status).toHaveTextContent('Enregistré'));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('renders the error toast as an assertive alert region', async () => {
    const { rerender } = render(
      <Harness
        toastId="notif-error"
        isLoading
        isError={false}
        isSuccess={false}
        message={{ loading: 'Chargement…', error: 'Erreur' }}
      />
    );
    await screen.findByText('Chargement…');

    rerender(
      <Harness
        toastId="notif-error"
        isLoading={false}
        isError
        isSuccess={false}
        message={{ loading: 'Chargement…', error: 'Erreur' }}
      />
    );

    const alert = await screen.findByRole('alert');
    await waitFor(() => expect(alert).toHaveTextContent('Erreur'));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
