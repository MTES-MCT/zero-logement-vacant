/// <reference types="cypress" />
// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })
//
// declare global {
//   namespace Cypress {
//     interface Chainable {
//       login(email: string, password: string): Chainable<void>
//       drag(subject: string, options?: Partial<TypeOptions>): Chainable<Element>
//       dismiss(subject: string, options?: Partial<TypeOptions>): Chainable<Element>
//       visit(originalFn: CommandOriginalFn, url: string, options: Partial<VisitOptions>): Chainable<Element>
//     }
//   }
// }

import {
  GroupPayload,
  type CampaignCreationPayload,
  type CampaignDTO,
  type GroupDTO,
  type HousingDTO,
  type PaginatedResponse
} from '@zerologementvacant/models';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      logIn(email?: string, password?: string): Chainable<void>;
      authenticateApi(email?: string, password?: string): Chainable<void>;
      // API SDK
      listHousings(): Chainable<Response<PaginatedResponse<HousingDTO>>>;
      createGroup(payload: GroupPayload): Chainable<Response<GroupDTO>>;
      createCampaignFromGroup(
        groupId: GroupDTO['id'],
        payload: CampaignCreationPayload
      ): Chainable<Response<CampaignDTO>>;
    }
  }
}

Cypress.Commands.add(
  'logIn',
  (
    email: string = Cypress.env('EMAIL'),
    password: string = Cypress.env('PASSWORD')
  ) => {
    cy.visit('/connexion');
    cy.findByLabelText(/^Adresse e-mail/).type(email);
    cy.findByLabelText(/^Mot de passe/).type(password);
    cy.findByRole('button', { name: /^Se connecter/ }).click();

    cy.location('pathname').should('eq', '/parc-de-logements');
  }
);

Cypress.Commands.add(
  'authenticateApi',
  (
    email: string = Cypress.env('EMAIL'),
    password: string = Cypress.env('PASSWORD')
  ) => {
    return cy
      .request({
        method: 'POST',
        url: Cypress.env('API') + '/auth/sign-in/email',
        body: { email, password }
      })
      .then(() => undefined);
  }
);

Cypress.Commands.add('listHousings', () => {
  return cy.authenticateApi().then(() => {
    return cy.request({
      method: 'GET',
      url: Cypress.env('API') + '/housing',
      qs: {
        page: 1,
        perPage: 10
      }
    });
  });
});

Cypress.Commands.add('createGroup', (payload: GroupPayload) => {
  return cy.authenticateApi().then(() =>
    cy.request({
      method: 'POST',
      url: Cypress.env('API') + `/groups`,
      body: payload
    })
  );
});

Cypress.Commands.add(
  'createCampaignFromGroup',
  (groupId: GroupDTO['id'], payload: CampaignCreationPayload) => {
    return cy.authenticateApi().then(() =>
      cy.request({
        method: 'POST',
        url: Cypress.env('API') + `/groups/${groupId}/campaigns`,
        body: payload
      })
    );
  }
);
