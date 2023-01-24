import React from 'react';
import { Container, Title } from '@dataesr/react-dsfr';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

const AccessibilityView = () => {
  useDocumentTitle('Accessibilité');
  return (
    <Container as="section" spacing="py-4w mb-4w">
      <Title as="h1">Déclaration d’accessibilité</Title>
      <p>
        Établie le <span>27 juin 2022</span>.
      </p>
      <p>
        Le <span>Ministère de la Transition Ecologique</span> s’engage à rendre
        son service accessible, conformément à l’article 47 de la loi n°
        2005-102 du 11 février 2005.
      </p>
      <p>
        Cette déclaration d’accessibilité s’applique à
        <strong> Zéro Logement Vacant </strong>
        <span>
          (<span>https://zerologementvacant.beta.gouv.fr/</span>)
        </span>
        .
      </p>

      <Title as="h2">État de conformité</Title>
      <p>
        <strong>Zéro Logement Vacant</strong> est{' '}
        <strong>
          <span data-printfilter="lowercase">non conforme</span>
        </strong>{' '}
        avec le
        <abbr title="Référentiel général d’amélioration de l’accessibilité">
          {' '}
          RGAA{' '}
        </abbr>
        .<span>Le site n’a encore pas été audité.</span>
      </p>

      <Title as="h2">Amélioration et contact</Title>
      <p>
        Si vous n’arrivez pas à accéder à un contenu ou à un service, vous
        pouvez contacter le responsable de
        <span> Zéro Logement Vacant </span>
        pour être orienté vers une alternative accessible ou obtenir le contenu
        sous une autre forme.
      </p>
      <ul className="basic-information feedback h-card">
        <li>
          E-mail&nbsp;:{' '}
          <a href="mailto:contact@zerologementvacant.beta.gouv.fr">
            contact@zerologementvacant.beta.gouv.fr
          </a>
        </li>
      </ul>

      <Title as="h2">Voie de recours</Title>
      <p>
        Cette procédure est à utiliser dans le cas suivant&nbsp;: vous avez
        signalé au responsable du site internet un défaut d’accessibilité qui
        vous empêche d’accéder à un contenu ou à un des services du portail et
        vous n’avez pas obtenu de réponse satisfaisante.
      </p>
      <p>Vous pouvez&nbsp;:</p>
      <ul>
        <li>
          Écrire un message au{' '}
          <a href="https://formulaire.defenseurdesdroits.fr/">
            Défenseur des droits
          </a>
        </li>
        <li>
          Contacter{' '}
          <a href="https://www.defenseurdesdroits.fr/saisir/delegues">
            le délégué du Défenseur des droits dans votre région
          </a>
        </li>
        <li>
          Envoyer un courrier par la poste (gratuit, ne pas mettre de
          timbre)&nbsp;:
          <br />
          Défenseur des droits
          <br />
          Libre réponse 71120 75342 Paris CEDEX 07
        </li>
      </ul>

      <hr />

      <p>
        Cette déclaration d’accessibilité a été créé le{' '}
        <span>27 juin 2022</span> grâce au{' '}
        <a href="https://betagouv.github.io/a11y-generateur-declaration/#create">
          Générateur de Déclaration d’Accessibilité de BetaGouv
        </a>
        .
      </p>
    </Container>
  );
};

export default AccessibilityView;
