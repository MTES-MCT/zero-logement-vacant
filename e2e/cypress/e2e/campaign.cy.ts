describe('Campaign', () => {
  it('should create a campaign', () => {
    cy.intercept('POST', Cypress.env('API') + '/housing').as('findHousings');
    cy.intercept('POST', Cypress.env('API') + '/housing/count').as(
      'countHousings'
    );

    cy.logIn();
    cy.get('button').contains('Bâtiment/DPE').click();
    cy.get('label').contains('Nombre de logements').next().click();
    cy.get('fieldset').contains('50 et plus').click();
    cy.wait('@findHousings');
    cy.wait('@countHousings');
    cy.get('table').find('fieldset').first().click();
    cy.get('button').contains('Créer une campagne').click();
    cy.get('label')
      .contains(/^Titre de la campagne/)
      .next()
      .type('50+ logements par bâtiment');
    cy.get('button').contains('Enregistrer').click();
    cy.location('pathname').should('match', /^\/campagnes\/.+/);

    // Fill the form
    cy.get('label')
      .contains(/^En date du/)
      .next()
      .type('01012024');
    cy.get('label')
      .contains(/^Écrit à/)
      .next()
      .type('Rennes');
    // TODO: complete this test
  });
});
