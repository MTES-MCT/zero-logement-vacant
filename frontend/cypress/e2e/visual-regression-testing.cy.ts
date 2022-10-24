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
    '/base-de-donnees',
    '/campagnes'
  ]

  paths.forEach(path => {
    it(`correspond to the snapshot for path ${path}`, () => {
      test(path)
    });
  })
});
