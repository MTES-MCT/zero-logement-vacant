describe('Two-Factor Authentication', () => {
  const adminEmail = Cypress.env('ADMIN_EMAIL') || 'admin@example.com';
  const adminPassword = Cypress.env('ADMIN_PASSWORD') || 'admin123';

  beforeEach(() => {
    // Mock the mail service to intercept the 2FA code
    cy.intercept('POST', '/api/authenticate', (req) => {
      // Check if it's an admin user
      if (req.body.email === adminEmail) {
        // Return 2FA required response
        req.reply({
          statusCode: 200,
          body: {
            requiresTwoFactor: true,
            email: adminEmail
          }
        });
      }
    }).as('login');

    cy.intercept('POST', '/api/authenticate/verify-2fa', (req) => {
      // Mock verification - in real scenario, you'd validate the code
      if (req.body.code === '123456') {
        req.reply({
          statusCode: 200,
          body: {
            user: {
              id: 'admin-id',
              email: adminEmail,
              firstName: 'Admin',
              lastName: 'User',
              role: 1 // ADMIN role
            },
            establishment: {
              id: 'est-id',
              name: 'Test Establishment'
            },
            accessToken: 'fake-jwt-token'
          }
        });
      } else {
        req.reply({
          statusCode: 401,
          body: { message: 'Invalid 2FA code' }
        });
      }
    }).as('verify2FA');
  });

  it('should require 2FA for admin users', () => {
    cy.visit('/admin');

    // Fill in login credentials
    cy.get('input[name="email"]').type(adminEmail);
    cy.get('input[name="password"]').type(adminPassword);
    cy.get('button[type="submit"]').click();

    // Wait for login request
    cy.wait('@login');

    // Should redirect to 2FA verification page
    cy.location('pathname').should('eq', '/verification-2fa');

    // Should display email
    cy.contains(adminEmail).should('be.visible');

    // Should have 2FA code input
    cy.get('input[name="code"]').should('be.visible');
  });

  it('should verify valid 2FA code and log in', () => {
    cy.visit('/admin');

    // Log in
    cy.get('input[name="email"]').type(adminEmail);
    cy.get('input[name="password"]').type(adminPassword);
    cy.get('button[type="submit"]').click();

    cy.wait('@login');

    // Should be on 2FA page
    cy.location('pathname').should('eq', '/verification-2fa');

    // Enter valid 2FA code
    cy.get('input[name="code"]').type('123456');
    cy.get('button[type="submit"]').click();

    cy.wait('@verify2FA');

    // Should redirect to dashboard after successful verification
    cy.location('pathname').should('eq', '/parc-de-logements');
  });

  it('should show error for invalid 2FA code', () => {
    cy.visit('/admin');

    // Log in
    cy.get('input[name="email"]').type(adminEmail);
    cy.get('input[name="password"]').type(adminPassword);
    cy.get('button[type="submit"]').click();

    cy.wait('@login');

    // Enter invalid 2FA code
    cy.get('input[name="code"]').type('999999');
    cy.get('button[type="submit"]').click();

    cy.wait('@verify2FA');

    // Should show error message
    cy.get('[data-testid="alert-error"]').should('be.visible');
    cy.contains('Code de vérification invalide').should('be.visible');

    // Should stay on 2FA page
    cy.location('pathname').should('eq', '/verification-2fa');
  });

  it('should allow canceling 2FA and return to login', () => {
    cy.visit('/admin');

    // Log in
    cy.get('input[name="email"]').type(adminEmail);
    cy.get('input[name="password"]').type(adminPassword);
    cy.get('button[type="submit"]').click();

    cy.wait('@login');

    // Should be on 2FA page
    cy.location('pathname').should('eq', '/verification-2fa');

    // Click cancel button
    cy.contains('button', 'Annuler').click();

    // Should return to admin login page
    cy.location('pathname').should('eq', '/admin');
  });

  it('should validate 2FA code format', () => {
    cy.visit('/admin');

    // Log in
    cy.get('input[name="email"]').type(adminEmail);
    cy.get('input[name="password"]').type(adminPassword);
    cy.get('button[type="submit"]').click();

    cy.wait('@login');

    // Try to submit with invalid format (less than 6 digits)
    cy.get('input[name="code"]').type('123');
    cy.get('button[type="submit"]').click();

    // Should show validation error
    cy.contains('Le code doit contenir 6 chiffres').should('be.visible');

    // Try to submit with non-numeric characters
    cy.get('input[name="code"]').clear();
    cy.get('input[name="code"]').type('abc123');
    cy.get('button[type="submit"]').click();

    // Should show validation error
    cy.contains('Le code doit contenir uniquement des chiffres').should('be.visible');
  });
});
