describe('Accessibility', () => {
  const viewports: ReadonlyArray<Cypress.ViewportPreset> = [
    'macbook-15',
    'macbook-13',
    'macbook-11',
    'iphone-6',
    'iphone-6+',
    'ipad-mini'
  ];

  function testAccessibility() {
    viewports.forEach((viewport) => {
      cy.injectAxe();
      if (Array.isArray(viewport)) {
        cy.viewport(viewport[0], viewport[1]);
      } else {
        cy.viewport(viewport);
      }
      cy.checkA11y();
    });
  }

  it('should be accessible on /parc-de-logements', () => {
    cy.intercept('GET', '/api/housing*').as('listHousings');
    cy.intercept('GET', '/api/housing/count*').as('countHousings');
    cy.intercept('GET', '/api/groups').as('listGroups');

    cy.logIn();
    cy.visit('/parc-de-logements');

    cy.wait(['@listHousings', '@countHousings', '@listGroups']);

    testAccessibility();
  });

  it('should be accessible on /groupes/:id', () => {
    cy.intercept('GET', '/api/groups').as('listGroups');

    cy.logIn();
    cy.visit('/parc-de-logements');

    cy.wait(['@listGroups']);

    cy.findAllByRole('group-card').first().click();
    cy.location('pathname').should('eq', '/groupes/*');

    testAccessibility();
  });
});
