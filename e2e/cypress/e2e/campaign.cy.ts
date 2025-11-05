describe('Campaign', () => {
  it('should create a campaign', () => {
    cy.intercept({
      method: 'GET',
      url: Cypress.env('API') + '/housing*'
    }).as('findHousings');
    cy.intercept('GET', Cypress.env('API') + '/housing/count*').as(
      'countHousings'
    );
    cy.intercept('POST', Cypress.env('API') + '/files').as('upload');

    cy.logIn();
    cy.wait(['@findHousings', '@countHousings']);

    cy.findAllByRole('checkbox', {
      name: /^Sélectionner le logement/
    })
      .filter((index) => index < 3)
      .check();
    cy.findByRole('button', { name: /^Exporter ou contacter/ }).click();
    cy.findByRole('button', { name: /^Créer une campagne/ }).click();
    cy.findByRole('button', { name: /^Créer une campagne/ }).click();

    cy.findByRole('dialog', {
      name: /^Créer une campagne/
    }).within(() => {
      cy.findByLabelText(/^Titre de la campagne/).type('Trois logements');
      cy.findByLabelText(/^Description/).type('Trois logements');
      cy.findByRole('button', { name: /^Créer une campagne/ }).click();
    });

    cy.location('pathname').should('match', /^\/campagnes\/.+/);

    cy.findByRole('tab', {
      name: 'Courrier'
    }).click();

    // Fill the form
    cy.get('form[name="draft"]').within(() => {
      cy.get('input[type="file"]')
        .first()
        .selectFile('cypress/fixtures/logo.png');
      cy.wait('@upload');

      cy.findByLabelText(/^En date du/).type('2024-01-01');
      cy.findByLabelText(/^Écrit à/).type('Marseille BB');

      cy.findByLabelText(/^Nom de la collectivité/).type(
        'Zéro Logement Vacant'
      );
      cy.findByLabelText(/^Service/).type('Logement');
      cy.findByLabelText(/^Nom$/).type('Logement Vacant');
      cy.findByLabelText(/^Prénom$/).type('Zéro');
      cy.findByLabelText(/^Adresse$/).type('1 rue de la République');
      cy.findByLabelText(/^Adresse courriel/).type(
        'zerologementvacant@beta.gouv.fr'
      );
      cy.findByLabelText(/^Téléphone/).type('0123456789');

      cy.findByLabelText(/^Objet/).type('Votre logement vacant à Marseille BB');
      cy.findByLabelText(/^Contenu de votre courrier/).type(
        `Madame, Monsieur,{enter}Marseille BB fait partie des lauréats du plan national de lutte contre les logements vacants du Ministère chargé de la Ville et du Logement. Ce plan a pour objectif d'accélérer, dans les territoires pilotes, la remise sur le marché immobilier (rénovation, location, vente, restructuration) du plus grand nombre possible de logements vacants. Dans ce cadre, l'ADIL 13 a été missionnée par Marseille BB pour assurer une mission d'information, de sensibilisation et d'accompagnement des propriétaires de logements vacants qui le souhaitent.{enter}Un formulaire vous est proposé dans le cadre d'une enquête destinée à mieux comprendre les raisons de la vacance et s'inscrit dans une politique plus globale afin de construire l'aide qui vous sera la plus adaptée, et permettrait la remise des biens sur un marché en forte demande.{enter}Depuis 2011, 960 propriétaires ont été accompagnés dans le cadre de l'opération Rennes Centre Ancien. Ce sont ainsi 300 logements vacants qui ont pu être réoccupés grâce à des aides publiques.{enter}Votre logement situé au 123 rue bidon, à Marseille BB a été recensé comme vacant, c'est-à-dire qu'il aurait été déclaré comme inoccupé depuis « Nombre année vacance du logement » au 1er Janvier 2022. Si tel n'est pas le cas, votre retour permettra d'actualiser l'état réel de son occupation.{enter}Un formulaire vous est proposé dans le cadre d'une enquête destinée à mieux comprendre les raisons de la vacance et s'inscrit dans une politique plus globale afin de construire l'aide qui vous sera la plus adaptée, et permettrait la remise des biens sur un marché en forte demande.{enter}Alors, pourquoi pas vous ?{enter}`
      );

      cy.findAllByLabelText(/^Nom du signataire/)
        .first()
        .type('PALAVACANCE');
      cy.findAllByLabelText(/^Prénom du signataire/)
        .first()
        .type('Nathan');
      cy.findAllByLabelText(/^Rôle du signataire/)
        .first()
        .type('Maire de Marseille BB');
    });

    cy.findByRole('button', {
      name: /^Valider et passer au téléchargement/
    }).click();
    cy.findByRole('dialog', {
      name: /^Valider ma campagne/
    }).within(() => {
      cy.findByRole('button', { name: /^Confirmer/ }).click();
    });

    cy.get('*')
      .contains('Vos fichiers à télécharger pour lancer votre campagne')
      .should('be.visible');

    cy.get('a')
      .contains(/^Télécharger les destinataires et vos courriers/, {
        timeout: 10_000
      })
      // Avoid opening a new tab which would break the test
      .invoke('removeAttr', 'href')
      .click();

    cy.findByLabelText(/^Date d’envoi de votre campagne/).type(
      new Date().toJSON().slice(0, 'yyyy-mm-dd'.length)
    );

    cy.findByRole('button', {
      name: /^Valider la date d’envoi de votre campagne/
    }).click();

    cy.findByRole('dialog', {
      name: /^Confirmer/
    }).click();
  });
});
