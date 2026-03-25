import type { GroupDTO } from '@zerologementvacant/models';

describe('Campaign', () => {
  function init(): Cypress.Chainable<GroupDTO> {
    cy.logIn();

    return cy.listHousings().then((response) => {
      if (!response.isOkStatusCode) {
        throw new Error(
          `Failed to list housings: ${response.status} ${response.statusText}`
        );
      }

      const housings = response.body.entities;

      return cy
        .createGroup({
          title: 'Logements vacants 2025',
          description:
            'Campagne de recensement des logements vacants pour l’année 2025',
          housing: {
            all: false,
            ids: housings.map((housing) => housing.id),
            filters: {}
          }
        })
        .then((response) => {
          if (!response.isOkStatusCode) {
            throw new Error(
              `Failed to create group: ${response.status} ${response.statusText}`
            );
          }

          cy.visit(`/groupes/${response.body.id}`);
          return cy.wrap(response.body);
        });
    });
  }

  it('should create a campaign from a group', () => {
    init();

    cy.findByRole('button', { name: /Créer une campagne/ }).click();
    cy.findByRole('dialog', { name: /Créer une campagne/ }).within(() => {
      cy.findByLabelText(/Nom/).type('Campagne 2025');
      cy.findByLabelText(/Description/).type('Campagne 2025');
      cy.findByRole('button', { name: /Confirmer/ }).click();
    });
    cy.location('pathname', { timeout: 10_000 }).should(
      'match',
      /\/campagnes\/.+/
    );

    cy.findByRole('button', { name: /Indiquer la date d’envoi/ }).click();
    cy.findByRole('dialog', { name: /Indiquer la date d’envoi/ }).within(() => {
      cy.findByLabelText(/Date d’envoi/).type('2025-01-01');
      cy.findByRole('button', { name: /Confirmer/ }).click();
    });
  });

  it('should fill the draft form', () => {
    init().then((group) => {
      return cy
        .createCampaignFromGroup(group.id, {
          title: group.title,
          description: group.description,
          sentAt: null
        })
        .then((response) => {
          if (!response.isOkStatusCode) {
            throw new Error(
              `Failed to create campaign from group: ${response.status} ${response.statusText}`
            );
          }

          cy.visit(`/campagnes/${response.body.id}`);
        });
    });

    cy.findByRole('tab', { name: /Courrier/ }).click();

    // TODO: upload sender logo
    cy.findByRole('textbox', { name: /Nom de la collectivité/ }).type(
      'Zéro Logement Vacant'
    );
    cy.findByRole('textbox', { name: /Service/ }).type('DINUM');
    cy.findByRole('textbox', { name: /^Prénom$/ }).type('Zéro');
    cy.findByRole('textbox', { name: /^Nom$/ }).type('Logement Vacant');
    cy.findByRole('textbox', { name: /^Adresse$/ }).type(
      '123 rue de la Vacance, 75000 Paris'
    );
    cy.findByRole('textbox', { name: /Adresse e-mail/ }).type('zlv@zlv.fr');
    cy.findByRole('textbox', { name: /Téléphone/ }).type('0123456789');
    cy.findByLabelText(/En date du/).type('2026-01-01');
    cy.findByRole('textbox', { name: /Écrit à/ }).type(
      '123 rue de la Vacance, 75000 Paris'
    );
    cy.findByRole('textbox', { name: /Objet/ }).type(
      'Recensement des logements vacants'
    );
    cy.findByRole('textbox', { name: /Contenu de votre courrier/ }).type(
      'Tempore harum dolor minima. Adipisci sit veniam neque illum rem architecto voluptatem. Nobis officiis laboriosam quis natus amet.'
    );
    cy.findByRole('group', { name: /Signature du premier expéditeur/ }).within(
      () => {
        cy.findByRole('textbox', { name: /Prénom du signataire/ }).type('Zéro');
        cy.findByRole('textbox', { name: /Nom du signataire/ }).type(
          'Logement Vacant'
        );
        cy.findByRole('textbox', { name: /Rôle du signataire/ }).type(
          'Chef de projet'
        );
        // TODO: upload logo
      }
    );
    cy.findByRole('group', { name: /Signature du second expéditeur/ }).within(
      () => {
        cy.findByRole('textbox', { name: /Prénom du signataire/ }).type(
          'Vacance'
        );
        cy.findByRole('textbox', { name: /Nom du signataire/ }).type('Zéro');
        cy.findByRole('textbox', { name: /Rôle du signataire/ }).type(
          'Chef de projet'
        );
        // TODO: upload logo
      }
    );

    cy.findByRole('button', { name: /Sauvegarder/ }).click();
    cy.findByRole('button', { name: /Télécharger les courriers/ }).click();
  });
});
