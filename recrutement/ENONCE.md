# Exercice technique — Import des Résidences Secondaires (RS)

> Cap recommandé : **~2 heures**. Finir à 100 % n'est pas l'attendu :
> on regarde **où tu vas, comment tu raisonnes, ce que tu laisses derrière toi.**
> Pousse au plus loin ce qui te paraît important, documente ce qui reste à faire.

On aura un regard particulier sur la pertinence, la compréhension globale, l’efficacité, l’élégance, l’honnêteté.

---

## Contexte

Zéro Logement Vacant (ZLV) est une application qui aide les collectivités à
contacter les propriétaires de logements vacants. La table centrale est
`fast_housing` (≥ 500 000 lignes en prod). Sa clé naturelle est
`(geo_code, local_id)`.

L'équipe reçoit régulièrement des fichiers nationaux qui annotent ce
parc : LOVAC (logements vacants), Fichiers Fonciers, etc. Ces imports doivent
s'intégrer sans écraser le travail des agents qui suivent les logements au
quotidien.

---

## Mission

Tu reçois un nouveau fichier source : `recrutement/fixtures/rs-2026.jsonl.gz`
(gzippé, ~1 million de lignes JSONL). Chaque ligne identifie un logement
**à reclasser en résidence secondaire** au titre de 2026.

Exemple de ligne :

```json
{
  "geo_code": "75056",
  "local_id": "75056ABCDEFGHI",
  "rs_source": "taxe-habitation",
  "invariant": "75056ABCDEFGHI",
  "address": "12 RUE EXAMPLE"
}
```

**Pour chaque ligne dont le `(geo_code, local_id)` correspond à un logement
existant** dans `fast_housing`, l'import doit :

1. mettre `occupancy = 'RS'` (résidence secondaire non louée) ;
2. mettre `status = 4` (suivi terminé) ;
3. ajouter `'rs-2026'` à `data_file_years` **sans écraser** les valeurs déjà présentes ;
4. être **traçable** : un agent qui consulte la fiche logement doit pouvoir
   voir, dans son historique, ce qui a changé et quand. Inspire-toi de ce que
   l'app fait déjà pour les autres imports.

**Tout le reste du logement doit être préservé.** Concrètement :

- `sub_status`, `rental_value`, `occupancy_intended`, et tous les autres champs
  → **inchangés**.
- Les precisions, campagnes, owners rattachés → **non touchés**.
- Y compris si un agent a modifié manuellement `occupancy`/`status` avant cet
  import : non, on les écrase quand même, c'est l'objet de cet import-là.
  Mais aucun autre champ ne bouge.

---

## Invariants impératifs

- **Idempotence.** Relancer l'import deux fois doit produire le même état final :
  pas de doublon d'historique, pas de réécriture inutile.
- **Préservation.** Aucun champ hors du périmètre (`occupancy`, `status`,
  `data_file_years`) ne change.
- **Traçabilité.** Chaque ligne du fichier produit un résultat observable :
  créée / mise à jour / rejetée. On doit pouvoir compter les trois.
- **Échelle.** Le fichier fait **1 million de lignes** ; la table en compte
  **≥ 500 000**.

---

## Méthode

Libre, à toi de choisir et de **justifier** ton choix.

Quelques pointeurs si tu veux explorer le repo :

- `server/src/scripts/import-lovac/`
- `server/src/repositories/housingRepository.ts`
- `packages/models/src/`

---

## Le fichier source n'est pas propre

À toi de l'inspecter, de décider quoi faire de ce que tu y trouves, et de
documenter tes choix.

---

## Bonus (à attaquer **seulement** si l'essentiel est solide)

Le fichier source contient un champ `rs_source` (`'taxe-habitation'` /
`'declaration'` / …). Il n'est **pas importé** en phase 1.

1. **Ajouter `rs_source` au modèle de données.** Migration de schéma sur
   `fast_housing` (colonne nullable). Inspire-toi de
   `server/src/infra/database/migrations/20260422114226_housings-add-geolocation-source.ts`
   pour la forme.
2. **L'exposer côté front.** Au choix : filtre dans la liste des logements,
   badge sur la fiche, autre — tant que c'est visible et exploitable.

---

## Setup

```bash
./recrutement/setup.sh
```

ou, équivalent étape par étape :

```bash
docker compose -f .docker/docker-compose.yml up -d db
yarn install --immutable
yarn build
yarn nx run server:migrate
yarn nx run server:seed
```

Compte ~2 à 4 minutes la première fois.

Pré-requis : Docker, Node ≥ 20 (24 recommandé), Yarn v4.

---

## Rendu attendu

Fork le dépôt et envoie-nous le lien. Inclus :

- ton code (et les tests qui te semblent utiles) ;
- un court **README** dans le dossier où tu as travaillé, qui répond à :
  - comment tu lances ton import ;
  - quelle architecture tu as choisie et **pourquoi** ;
  - ce que tu as fait / pas fait / ferais ensuite avec plus de temps ;
  - les cas du fichier source que tu as identifiés et comment tu les as traités.

On débriefera tout ça en visio. Bon courage, et amuse-toi.
