import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';

import OnboardingModal from '../OnboardingModal';

describe('OnboardingModal', () => {
  function setup(onboarding = false) {
    const router = createMemoryRouter(
      [
        {
          path: '/parc-de-logements',
          element: <OnboardingModal />
        }
      ],
      {
        initialEntries: [
          {
            pathname: '/parc-de-logements',
            state: { onboarding }
          }
        ]
      }
    );

    render(<RouterProvider router={router} />);
  }

  it('should not load the registration form outside onboarding', () => {
    setup();

    expect(
      screen.queryByTitle(
        'Inscription session de prise en main Zéro Logement Vacant'
      )
    ).not.toBeInTheDocument();
  });

  it('should load the registration form during onboarding', () => {
    setup(true);

    expect(
      screen.getByTitle(
        'Inscription session de prise en main Zéro Logement Vacant'
      )
    ).toHaveAttribute(
      'src',
      'https://app.livestorm.co/p/1b26afab-3332-4b6d-a9e4-3f38b4cc6c43/form'
    );
  });
});
