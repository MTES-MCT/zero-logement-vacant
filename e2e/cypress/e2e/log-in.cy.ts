describe('Log in', () => {
  it('should log in', () => {
    const email = Cypress.env('EMAIL');
    const password = Cypress.env('PASSWORD');

    cy.visit('/connexion');
    cy.get('input[label^="Adresse email"]').type(email);
    cy.get('input[label^="Mot de passe"]').type(password);
    cy.get('button[type="submit"]').click();

    cy.location('pathname').should('eq', '/parc-de-logements');
  });
});
