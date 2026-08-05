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
      http.get(`${config.apiEndpoint}/reset-links/:id`, () =>
        HttpResponse.json({ valid: true })
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

  it('should keep the password policy neutral before the user interacts with the form', async () => {
    setup();

    const password = await screen.findByLabelText(/^Créer votre mot de passe/);
    const uppercaseCriterion = screen
      .getAllByText('Au moins une majuscule.')
      .find((element) => element.textContent?.includes('Critère'));

    expect(password).not.toHaveAttribute('aria-invalid');
    expect(uppercaseCriterion).toHaveTextContent(
      'Critère à respecter : Au moins une majuscule.'
    );
    expect(uppercaseCriterion).not.toHaveClass('fr-error-text');
    expect(uppercaseCriterion).not.toHaveClass('fr-valid-text');
  });

  it('should mark a mismatched password confirmation as invalid and associate the error to the field (RGAA 11.10)', async () => {
    setup();

    // Both fields must be non-empty to pass native HTML `required` validation
    // (this legacy form has no `noValidate`) and reach the custom yup check.
    const password = await screen.findByLabelText(/^Créer votre mot de passe/);
    await user.type(password, 'MotDePasse123');
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
    await user.type(password, 'MotDePasse123');
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
    await user.type(passwordConfirmation, 'MotDePasse123');
    await user.click(submit);

    expect(passwordConfirmation).not.toHaveAttribute('aria-invalid');
  });

  it('should associate password policy errors with the field and not submit (RGAA 11.10)', async () => {
    setup();
    const resetPassword = vi.fn();
    mockAPI.use(
      http.post(`${config.apiEndpoint}/account/reset-password`, () => {
        resetPassword();
        return new HttpResponse(null, { status: 200 });
      })
    );

    const password = await screen.findByLabelText(/^Créer votre mot de passe/);
    await user.type(password, 'motdepasse123');
    await user.type(
      screen.getByLabelText(/^Confirmer votre mot de passe/),
      'motdepasse123'
    );
    await user.click(
      screen.getByRole('button', {
        name: /Enregistrer le nouveau mot de passe/i
      })
    );

    expect(password).toHaveAttribute('aria-invalid', 'true');
    expect(password).toHaveAccessibleDescription(/Au moins une majuscule/);
    const uppercaseCriterion = screen
      .getAllByText('Au moins une majuscule.')
      .find((element) => element.textContent?.includes('Critère non respecté'));
    expect(uppercaseCriterion).toBeVisible();
    expect(uppercaseCriterion).toHaveTextContent(
      'Critère non respecté : Au moins une majuscule.'
    );
    expect(resetPassword).not.toHaveBeenCalled();
  });

  it('should announce an actionable error when the password cannot be reset', async () => {
    setup();
    mockAPI.use(
      http.post(`${config.apiEndpoint}/account/reset-password`, () =>
        HttpResponse.json(
          { name: 'InternalServerError', message: 'Internal Server Error' },
          { status: 500 }
        )
      )
    );

    const password = await screen.findByLabelText(/^Créer votre mot de passe/);
    await user.type(password, 'MotDePasse123');
    const passwordConfirmation = screen.getByLabelText(
      /^Confirmer votre mot de passe/
    );
    await user.type(passwordConfirmation, 'MotDePasse123');
    await user.click(
      screen.getByRole('button', {
        name: /Enregistrer le nouveau mot de passe/i
      })
    );

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(
      'Votre mot de passe n’a pas pu être enregistré. Veuillez réessayer.'
    );
    expect(password).toHaveValue('MotDePasse123');
  });

  it('should reset a password without special characters and announce success', async () => {
    setup();
    let requestBody: unknown;
    mockAPI.use(
      http.post(
        `${config.apiEndpoint}/account/reset-password`,
        async ({ request }) => {
          requestBody = await request.json();
          return new HttpResponse(null, { status: 200 });
        }
      )
    );

    const password = await screen.findByLabelText(/^Créer votre mot de passe/);
    await user.type(password, 'MotDePasse123');
    await user.type(
      screen.getByLabelText(/^Confirmer votre mot de passe/),
      'MotDePasse123'
    );
    await user.click(
      screen.getByRole('button', {
        name: /Enregistrer le nouveau mot de passe/i
      })
    );

    const status = await screen.findByRole('status');
    expect(status).toHaveTextContent('Votre mot de passe a été réinitialisé');
    expect(requestBody).toEqual({
      key: linkId,
      password: 'MotDePasse123'
    });
  });
});
