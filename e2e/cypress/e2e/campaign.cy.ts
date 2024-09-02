describe('Campaign', () => {
  it('should create a campaign', () => {
    cy.intercept('POST', Cypress.env('API') + '/housing').as('findHousings');
    cy.intercept('POST', Cypress.env('API') + '/housing/count').as(
      'countHousings'
    );
    cy.intercept('POST', Cypress.env('API') + '/files').as('upload');

    cy.logIn();
    cy.wait(['@findHousings', '@countHousings']);
    cy.get('tbody')
      .find('fieldset')
      .then((checkboxes) => checkboxes.slice(0, 3))
      .each((checkbox) => {
        cy.wrap(checkbox).click();
      });
    cy.get('button').contains('Créer une campagne').click();
    cy.get('label')
      .contains(/^Titre de la campagne/)
      .next()
      .type('3 logements');
    cy.get('button').contains('Enregistrer').click();
    cy.location('pathname').should('match', /^\/campagnes\/.+/);

    cy.get('button').contains('Courrier').click();

    // Fill the form
    cy.get('form[name="draft"]').within(() => {
      cy.get('input[type="file"]')
        .first()
        .selectFile('cypress/fixtures/logo.png');
      cy.wait('@upload');

      cy.get('label')
        .contains(/^En date du/)
        .next()
        .type('2024-01-01');
      cy.get('label')
        .contains(/^Écrit à/)
        .next()
        .type('Marseille BB');

      cy.get('label')
        .contains(/^Nom de la collectivité/)
        .next()
        .type('Zéro Logement Vacant');
      cy.get('label')
        .contains(/^Service/)
        .next()
        .type('Logement');
      cy.get('label').contains(/^Nom$/).next().type('Logement Vacant');
      cy.get('label')
        .contains(/^Prénom/)
        .next()
        .type('Zéro');
      cy.get('label').contains('Adresse').next().type('1 rue de la République');
      cy.get('label')
        .contains(/^Adresse courriel/)
        .next()
        .type('zerologementvacant@beta.gouv.fr');
      cy.get('label')
        .contains(/^Téléphone/)
        .next()
        .type('0123456789');

      cy.get('label')
        .contains(/^Objet/)
        .next()
        .type('Votre logement vacant');
      cy.get('div[aria-labelledby="draft-body-label"]')
        .type('Madame, Monsieur,{enter}')
        .type(
          'Marseille BB fait partie des lauréats du plan national de lutte contre les logements vacants du Ministère de la Transition écologique et de la Cohésion des Territoires. Ce plan a pour objectif d’accélérer, dans les territoires pilotes, la remise sur le marché immobilier (rénovation, location, vente, restructuration) du plus grand nombre possible de logements vacants. Dans ce cadre, l’ADIL 13 a été missionnée par Marseille BB pour assurer une mission d’information, de sensibilisation et d’accompagnement des propriétaires de logements vacants qui le souhaitent.{enter}'
        )
        .type(
          'Un formulaire vous est proposé dans le cadre d’une enquête destinée à mieux comprendre les raisons de la vacance et s’inscrit dans une politique plus globale afin de construire l’aide qui vous sera la plus adaptée, et permettrait la remise des biens sur un marché en forte demande.{enter}'
        )
        .type(
          'Depuis 2011, 960 propriétaires ont été accompagnés dans le cadre de l’opération Rennes Centre Ancien. Ce sont ainsi 300 logements vacants qui ont pu être réoccupés grâce à des aides publiques.{enter}'
        )
        .type(
          'Votre logement situé au 123 rue bidon, à Marseille BB a été recensé comme vacant, c’est-à-dire qu’il aurait été déclaré comme inoccupé depuis « Nombre année vacance du logement » au 1er Janvier 2022. Si tel n’est pas le cas, votre retour permettra d’actualiser l’état réel de son occupation.{enter}'
        )
        .type(
          'Un formulaire vous est proposé dans le cadre d’une enquête destinée à mieux comprendre les raisons de la vacance et s’inscrit dans une politique plus globale afin de construire l’aide qui vous sera la plus adaptée, et permettrait la remise des biens sur un marché en forte demande.{enter}'
        )
        .type('Alors, pourquoi pas vous ?{enter}');

      cy.get('label')
        .contains(/^Nom du signataire/)
        .next()
        .type('PALAVACANCE');
      cy.get('label')
        .contains(/^Prénom du signataire/)
        .next()
        .type('Nathan');
      cy.get('label')
        .contains(/^Rôle du signataire/)
        .next()
        .type('Maire de Marseille BB');
    });

    cy.get('button')
      .contains(/^Valider et passer au téléchargement/)
      .click();

    cy.get('dialog[open="true"]')
      .find('button')
      .contains(/^Confirmer/)
      .click();

    cy.get('*')
      .contains('Chargement de vos courriers en cours')
      .should('be.visible');

    cy.get('a')
      .contains(/^Télécharger les courriers/, { timeout: 10_000 })
      .should('be.visible');

    cy.get('label')
      .contains(/^Date d’envoi de votre campagne/)
      .type(new Date().toJSON().slice(0, 'yyyy-mm-dd'.length));

    cy.get('button')
      .contains(/^Confirmer et passer au suivi/)
      .click();

    cy.get('dialog[open="true"]')
      .find('button')
      .contains(/^Confirmer/)
      .click();
  });
});
