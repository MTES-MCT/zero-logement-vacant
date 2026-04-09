describe('Group', () => {
  describe('Create a group', () => {
    it('should create a group and add housings to it', () => {
      cy.intercept('GET', '/api/housing*').as('listHousings');
      cy.intercept('GET', '/api/housing/count*').as('countHousings');
      cy.intercept('GET', '/api/groups').as('listGroups');

      cy.logIn();
      cy.visit('/parc-de-logements');

      cy.wait(['@listHousings', '@countHousings', '@listGroups']);

      cy.findByRole('checkbox', {
        name: 'Sélectionner tous les éléments'
      }).click();
      cy.findByRole('button', { name: 'Intégrer dans un groupe' }).click();
      cy.findByRole('dialog', {
        name: 'Ajouter dans un groupe de logements'
      }).within(() => {
        cy.findByRole('button', { name: 'Créer un nouveau groupe' }).click();
      });
      cy.findByRole('dialog', {
        name: 'Créer un nouveau groupe de logements'
      }).within(() => {
        cy.findByRole('textbox', { name: /^Nom du groupe/ }).type('Tous');
        cy.findByRole('textbox', { name: /^Description du groupe/ }).type(
          'Tous les logements'
        );
        cy.findByRole('button', { name: 'Créer un groupe' }).click();
      });

      cy.location('pathname').should('match', /\/groupes\/[a-z0-9-]+/);
    });

    it('should delete a group', () => {
      cy.intercept('GET', '/api/housing*').as('listHousings');
      cy.intercept('GET', '/api/housing/count*').as('countHousings');
      cy.intercept('GET', '/api/groups').as('listGroups');

      cy.logIn();
      cy.visit('/parc-de-logements');

      cy.wait(['@listHousings', '@countHousings', '@listGroups']);

      cy.findByRole('checkbox', {
        name: 'Sélectionner tous les éléments'
      }).click();
      cy.findByRole('button', { name: 'Intégrer dans un groupe' }).click();
      cy.findByRole('dialog', {
        name: 'Ajouter dans un groupe de logements'
      }).within(() => {
        cy.findByRole('button', { name: 'Créer un nouveau groupe' }).click();
      });
      cy.findByRole('dialog', {
        name: 'Créer un nouveau groupe de logements'
      }).within(() => {
        cy.findByRole('textbox', { name: /^Nom du groupe/ }).type('Tous');
        cy.findByRole('textbox', { name: /^Description du groupe/ }).type(
          'Tous les logements'
        );
        cy.findByRole('button', { name: 'Créer un groupe' }).click();
      });

      cy.location('pathname').should('match', /\/groupes\/[a-z0-9-]+/);

      cy.findByRole('button', { name: 'Supprimer le groupe' }).click();
      cy.findByRole('dialog', { name: 'Supprimer le groupe' }).within(() => {
        cy.findByRole('button', { name: 'Confirmer' }).click();
      });
      cy.location('pathname').should('eq', '/parc-de-logements');
    });
  });
});
