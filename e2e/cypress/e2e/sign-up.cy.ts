import { faker } from '@faker-js/faker/locale/fr';

const VALID_PASSWORD = '1234QWERasdf';

describe('Sign up', () => {
  it('should sign up', () => {
    cy.visit('/connexion');
    cy.get('a').contains('Créer votre compte').click();

    const user = faker.internet.email();

    cy.get('label')
      .contains(/Adresse e-mail/i)
      .next()
      .type(`${user}{enter}`);

    cy.location('pathname').should('eq', '/inscription/activation');

    // Fetch emails from the Nodemailer API
    cy.request({
      method: 'GET',
      url: `${Cypress.env('MAILER_HOST')}/email`,
      auth: {
        username: Cypress.env('MAILER_USER'),
        password: Cypress.env('MAILER_PASSWORD')
      }
    }).then((response) => {
      const emails: ReadonlyArray<Email> = response.body;
      const email: Email = emails
        .filter(subject('Activation du compte'))
        .filter(to(user))
        .filter(unread())
        .reduce((acc, email) => (acc.date > email.date ? acc : email));
      const link = email.html.substring(
        email.html.indexOf('/inscription/mot-de-passe')
      );
      cy.visit(link);
    });

    cy.get('label')
      .contains(/Définissez votre mot de passe/i)
      .next()
      .type(VALID_PASSWORD);
    cy.get('label')
      .contains(/Confirmez votre mot de passe/i)
      .next()
      .type(`${VALID_PASSWORD}{enter}`);

    cy.get('button')
      .contains(/Créer mon compte/i)
      .click();

    cy.location('pathname').should('eq', '/parc-de-logements');
  });

  it('should await access to LOVAC', () => {
    cy.visit('/connexion');
    cy.get('a').contains('Créer votre compte').click();

    const user = 'lovac_ko@beta.gouv.fr';

    cy.get('label')
      .contains(/Adresse e-mail/i)
      .next()
      .type(`${user}{enter}`);

    cy.location('pathname').should('eq', '/inscription/activation');

    // Fetch emails from the Nodemailer API
    cy.request({
      method: 'GET',
      url: `${Cypress.env('MAILER_HOST')}/email`,
      auth: {
        username: Cypress.env('MAILER_USER'),
        password: Cypress.env('MAILER_PASSWORD')
      }
    }).then((response) => {
      const emails: ReadonlyArray<Email> = response.body;
      const email: Email = emails
        .filter(subject('Activation du compte'))
        .filter(to(user))
        .filter(unread())
        .reduce((acc, email) => (acc.date > email.date ? acc : email));
      const link = email.html.substring(
        email.html.indexOf('/inscription/mot-de-passe')
      );
      cy.visit(link);
    });

    cy.location('pathname').should('eq', '/inscription/en-attente');
  });

  it('should forbid access to unauthorized users', () => {
    cy.visit('/connexion');
    cy.get('a').contains('Créer votre compte').click();

    const user = 'account_ko@beta.gouv.fr';

    cy.get('label')
      .contains(/Adresse e-mail/i)
      .next()
      .type(`${user}{enter}`);

    cy.location('pathname').should('eq', '/inscription/activation');

    // Fetch emails from the Nodemailer API
    cy.request({
      method: 'GET',
      url: `${Cypress.env('MAILER_HOST')}/email`,
      auth: {
        username: Cypress.env('MAILER_USER'),
        password: Cypress.env('MAILER_PASSWORD')
      }
    }).then((response) => {
      const emails: ReadonlyArray<Email> = response.body;
      const email: Email = emails
        .filter(subject('Activation du compte'))
        .filter(to(user))
        .filter(unread())
        .reduce((acc, email) => (acc.date > email.date ? acc : email));
      const link = email.html.substring(
        email.html.indexOf('/inscription/mot-de-passe')
      );
      cy.visit(link);
    });

    cy.location('pathname').should('eq', '/inscription/impossible');
  });
});

interface Email {
  id: string;
  html: string;
  subject: string;
  from: ReadonlyArray<{
    address: string;
    name: string;
  }>;
  to: ReadonlyArray<{
    address: string;
    name: string;
  }>;
  date: string;
  read: boolean;
}

function subject(subject: string) {
  return (email: Email) => email.subject === subject;
}

function to(recipient: string) {
  return (email: Email) => email.to.some((to) => to.address === recipient);
}

function unread() {
  return (email: Email) => !email.read;
}
