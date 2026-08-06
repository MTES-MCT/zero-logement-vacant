import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { Provider } from 'react-redux';
import { createMemoryRouter, RouterProvider } from 'react-router';

import { mockAPI } from '~/mocks/mock-api';
import config from '~/utils/config';

import configureTestStore from '../../../utils/storeUtils';
import ResetPasswordView from '../ResetPasswordView';

describe('ResetPasswordView', () => {
  const user = userEvent.setup();
  const linkId = 'a1b2c3d4-0000-4000-8000-000000000000';

  function setup() {
    mockAPI.use(
      http.get(`${config.apiEndpoint}/reset-links/:id`, ({ params }) =>
        HttpResponse.json({
          id: params.id,
          createdAt: new Date().toJSON(),
          expiresAt: new Date(Date.now() + 60 * 60 * 1000).toJSON()
        })
      ),
      http.post(`${config.apiEndpoint}/account/reset-password`, () =>
        HttpResponse.json(null, { status: 200 })
      )
    );

    const store = configureTestStore();
    const router = createMemoryRouter(
      [
        {
          path: '/mot-de-passe/nouveau',
          element: <ResetPasswordView />
        }
      ],
      {
        initialEntries: [
          { pathname: '/mot-de-passe/nouveau', hash: `#${linkId}` }
        ]
      }
    );
    render(
      <Provider store={store}>
        <RouterProvider router={router} />
      </Provider>
    );
  }

  it('should mark a mismatched password confirmation as invalid and associate the error to the field (RGAA 11.10)', async () => {
    setup();

    // Both fields must be non-empty to pass native HTML `required` validation
    // (this legacy form has no `noValidate`) and reach the custom yup check.
    const password = await screen.findByLabelText(/^Créer votre mot de passe/);
    await user.type(password, 'Abcdefghij1');
    const passwordConfirmation = screen.getByLabelText(
      /^Confirmer votre mot de passe/
    );
    await user.type(passwordConfirmation, 'somethingElse1');

    const submit = screen.getByRole('button', {
      name: /Enregistrer le nouveau mot de passe/i
    });
    await user.click(submit);

    await screen.findByText('Les mots de passe doivent être identiques.');

    expect(passwordConfirmation).toHaveAttribute('aria-invalid', 'true');
    expect(passwordConfirmation).toHaveAccessibleDescription(
      'Les mots de passe doivent être identiques.'
    );
  });

  it('should clear the invalid state once the passwords match', async () => {
    setup();

    const password = await screen.findByLabelText(/^Créer votre mot de passe/);
    await user.type(password, 'Abcdefghij1');
    const passwordConfirmation = screen.getByLabelText(
      /^Confirmer votre mot de passe/
    );
    await user.type(passwordConfirmation, 'somethingElse1');

    const submit = screen.getByRole('button', {
      name: /Enregistrer le nouveau mot de passe/i
    });
    await user.click(submit);

    await screen.findByText('Les mots de passe doivent être identiques.');
    expect(passwordConfirmation).toHaveAttribute('aria-invalid', 'true');

    await user.clear(passwordConfirmation);
    await user.type(passwordConfirmation, 'Abcdefghij1');
    await user.click(submit);

    expect(passwordConfirmation).not.toHaveAttribute('aria-invalid');
  });
});
