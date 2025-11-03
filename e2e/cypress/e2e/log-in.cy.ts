describe('Log in', () => {
  it('should log in', () => {
    const email = Cypress.env('EMAIL');
    const password = Cypress.env('PASSWORD');

    cy.visit('/connexion');

    cy.findByLabelText(/^Adresse email/i).type(email);
    cy.findByLabelText(/^Mot de passe/i).type(password);
    cy.findByRole('button', { name: /Se connecter/i }).click();

    cy.location('pathname').should('eq', '/parc-de-logements');
  });
});
