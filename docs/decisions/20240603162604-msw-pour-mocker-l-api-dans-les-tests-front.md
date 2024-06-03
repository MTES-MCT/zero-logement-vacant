---
# Ce sont des éléments optionnels. N'hésitez pas à en supprimer certains.
statut: proposé
date: 2024-06-03
décideurs: @Falinor @loicguillois
---

# Mocker l’API pour tester le front

## Contexte et problématique

On utilisait auparavant [jest-fetch-mock](https://www.npmjs.com/package/jest-fetch-mock)
pour mocker les appels à l’API dans les tests front. Cette approche oblige à
écrire le matching **pour la prochaine requête** interceptée par le navigateur.
Or, on ne peut pas se reposer sur l’ordre d’exécution des requêtes.

```ts
// Exemple de matching avec jest-fetch-mock
fetchMock.mockResponse((request: Request) => {
  return Promise.resolve(
    request.url === `${config.apiEndpoint}/api/housing`
      ? { body: JSON.stringify(paginated), init: { status: 200 } }
      : request.url === `${config.apiEndpoint}/api/campaigns`
        ? { body: JSON.stringify([campaign]), init: { status: 200 } }
        : request.url === `${config.apiEndpoint}/api/geo/perimeters`
          ? { body: JSON.stringify([]), init: { status: 200 } }
          : request.url.startsWith(`${config.apiEndpoint}/api/localities`)
            ? { body: JSON.stringify([]), init: { status: 200 } }
            : request.url === `${config.apiEndpoint}/api/housing/count`
              ? {
                  body: JSON.stringify({ housing: 1, owners: 1 }),
                  init: { status: 200 }
                }
              : { body: '', init: { status: 404 } }
  );
});
```

Pour parer à cela, la fonction `mockRequests` dans [frontend/src/utils/test/requestUtils.ts](frontend/src/utils/test/requestUtils.ts)
a été créée.
Elle étend `jest-fetch-mock` pour permettre de mocker les requêtes en fonction
de _matchers_ basés sur l’URL, la méthode HTTP et le corps de la requête.
Cette solution a été utile, mais elle montre ses limites car elle doit être
maintenue et améliorée en fonction des besoins.
Elle ne permet pas d’écraser un match existant par exemple.

Par ailleurs, cette solution patch `fetch` globalement, ce qui peut poser des
problèmes de compatibilité et de typage statique.

```ts
// Exemple de matching avec mockRequests
mockRequests([
  {
    pathname: '/api/housing',
    persist: true,
    response: async (request) => {
      const body = await request.json();
      const { housingKinds, status } = body.filter;
      const filtered = housings
        .filter((housing) => (status ? status === housing.status : true))
        .filter((housing) =>
          housingKinds ? housingKinds.includes(housing.housingKind) : true
        );
      return {
        body: JSON.stringify(genPaginatedResult(filtered))
      };
    }
  },
  {
    pathname: '/api/housing/count',
    method: 'POST',
    persist: true,
    response: async (request) => {
      const body = await request.json();
      const { housingKinds, status } = body.filters;
      const filtered = housings
        .filter((housing) => (status ? status === housing.status : true))
        .filter((housing) =>
          housingKinds ? housingKinds.includes(housing.housingKind) : true
        );
      return {
        body: JSON.stringify({
          housing: filtered.length,
          owners: uniqueOwners(filtered).length
        })
      };
    }
  }
]);
```

## Critères de décision

- Décrire un happy path
- Overrider un match existant
- Bénéficier d’un typage statique fort
- Utiliser une solution maintenue

## Options envisagées

- [msw](https://mswjs.io/)

## Décision

[msw](https://mswjs.io/) est la meilleure option pour mocker l’API dans les
tests front, car c’est un vrai serveur qui ne patch pas `fetch` globalement.
Elle permet de décrire un happy path, d’overrider un match existant et offre un
typage statique fort pour les paramètres et les réponses.

```ts
// Exemple de matching avec msw
import { http, HttpResponse, RequestHandler } from 'msw';

import {
  CampaignCreationPayloadDTO,
  CampaignDTO
} from '@zerologementvacant/models';
import data from './data';
import config from '../../utils/config';

export const campaignHandlers: RequestHandler[] = [
  http.get<Record<string, never>, never, CampaignDTO[]>(
    `${config.apiEndpoint}/api/campaigns`,
    () => {
      return HttpResponse.json(data.campaigns);
    }
  )
];
```

### Conséquences

- Bon, parce que `msw` est une solution plus robuste et maintenue

## Plus d’information

[Philosophie](https://mswjs.io/docs/philosophy#mock-vs-network-behavior)
[Comparatif des solutions](https://mswjs.io/docs/comparison)
