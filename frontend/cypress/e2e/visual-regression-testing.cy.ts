describe('Visual regression testing', () => {
  function test(path: string): void {
    cy.login(Cypress.env('USER_EMAIL'), Cypress.env('USER_PASSWORD'))
      .visit(path)
      .matchImageSnapshot(path)
  }

  const paths = [
    '/accueil',
    '/stats',
    '/accessibilite',
    '/campagnes',
    '/perimetres',
    '/ressources',
    '/compte/mot-de-passe'
  ]

  it('should correspond to the snapshot for the path landing', () => {
    cy.visit('/')
    cy.matchImageSnapshot('landing')
  });

  paths.forEach(path => {
    it(`should correspond to the snapshot for path ${path}`, () => {
      test(path)
    });
  });

  it('should test /base-de-donnees', () => {
    cy.intercept('/api/campaigns').as('campaigns');
    cy.intercept('/api/geo/perimeters').as('perimeters');
    cy.intercept('/api/housing').as('housing');

    cy.login(Cypress.env('USER_EMAIL'), Cypress.env('USER_PASSWORD'))
    cy.visit('/base-de-donnees')
    cy.wait(['@campaigns', '@perimeters', '@housing'])
    cy.matchImageSnapshot('/base-de-donnees');
  });

  it('should test /suivi/etablissement/id', () => {
    cy.intercept('/api/monitoring/establishments/data').as('data');
    cy.intercept('/api/housing').as('housing');

    cy.login(Cypress.env('USER_EMAIL'), Cypress.env('USER_PASSWORD'))
      .get('nav')
      .contains('Suivi')
      .click()
    cy.wait(['@data', '@housing'])
    cy.matchImageSnapshot('/suivi/etablissement/id')
  });
});
