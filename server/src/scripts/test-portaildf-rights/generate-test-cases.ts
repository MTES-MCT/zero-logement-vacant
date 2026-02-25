/**
 * Script pour générer tous les cas de test de vérification des droits Portail DF
 *
 * Ce script récupère les données réelles de Portail DF et génère :
 * - Des établissements de test avec différents périmètres
 * - Des utilisateurs de test avec différentes combinaisons de droits (pour la CONNEXION)
 * - Des prospects et signup links (pour la CRÉATION DE COMPTE)
 * - Un tableau récapitulatif de tous les cas de test
 *
 * Usage:
 *   npx tsx server/src/scripts/test-portaildf-rights/generate-test-cases.ts [email]
 *
 * Exemple:
 *   npx tsx server/src/scripts/test-portaildf-rights/generate-test-cases.ts test.strasbourg@zlv.fr
 */

import 'dotenv/config';

const config = {
  cerema: {
    api: process.env.CEREMA_API || 'https://portaildf.cerema.fr',
    username: process.env.CEREMA_USERNAME || '',
    password: process.env.CEREMA_PASSWORD || ''
  }
};

// =============================================================================
// TYPES
// =============================================================================

interface PortailDFUser {
  email: string;
  structure: number;
  groupe: number;
}

interface PortailDFStructure {
  id: number;
  siret: string;
  nom: string;
  acces_lovac: string | null;
}

interface PortailDFGroup {
  id_groupe: number;
  nom: string;
  structure: number;
  perimetre: number;
  niveau_acces: string;
  df_ano: boolean;
  df_non_ano: boolean;
  lovac: boolean;
}

interface PortailDFPerimeter {
  perimetre_id: number;
  origine: string;
  fr_entiere: boolean;
  reg: string[];
  dep: string[];
  epci: string[];
  comm: string[];
}

interface FullUserData {
  email: string;
  user: PortailDFUser;
  structure: PortailDFStructure;
  group: PortailDFGroup | null;
  perimeter: PortailDFPerimeter | null;
}

interface TestCase {
  id: string;
  description: string;
  email: string;
  establishmentName: string;
  geoCodes: string[];
  perimeterValid: boolean;
  accessLevelValid: boolean;
  structureAccessValid: boolean;
  expectedSuspended: boolean;
  expectedCause: string | null;
  loginResult: 'OK' | 'SUSPENDED' | 'FORBIDDEN';
  createAccountResult: 'OK' | 'ERROR';
  // Type de test
  testType: 'login' | 'create_account' | 'both';
}

// Note: LoginTestCase et CreateAccountTestCase pourraient être utilisés
// pour un typage plus strict, mais pour l'instant on utilise TestCase directement

// =============================================================================
// API FUNCTIONS
// =============================================================================

async function authenticate(): Promise<string | null> {
  if (!config.cerema.username || !config.cerema.password) {
    console.error('❌ CEREMA_USERNAME et CEREMA_PASSWORD requis');
    return null;
  }

  const formData = new FormData();
  formData.append('username', config.cerema.username);
  formData.append('password', config.cerema.password);

  const response = await fetch(`${config.cerema.api}/api/api-token-auth/`, {
    method: 'POST',
    body: formData
  });

  if (!response.ok) return null;
  const data = await response.json() as { token: string };
  return data.token;
}

async function fetchAPI<T>(token: string, endpoint: string): Promise<T | null> {
  const response = await fetch(`${config.cerema.api}${endpoint}`, {
    method: 'GET',
    headers: {
      'Authorization': `Token ${token}`,
      'Content-Type': 'application/json'
    }
  });
  if (!response.ok) return null;
  return await response.json() as T;
}

async function fetchUserData(token: string, email: string): Promise<FullUserData | null> {
  const userResponse = await fetchAPI<{ count: number; results: PortailDFUser[] }>(
    token,
    `/api/utilisateurs/?email=${encodeURIComponent(email)}`
  );

  if (!userResponse || userResponse.count === 0) return null;

  const user = userResponse.results[0];
  const structure = await fetchAPI<PortailDFStructure>(token, `/api/structures/${user.structure}/`);
  if (!structure) return null;

  let group: PortailDFGroup | null = null;
  let perimeter: PortailDFPerimeter | null = null;

  if (user.groupe) {
    group = await fetchAPI<PortailDFGroup>(token, `/api/groupes/${user.groupe}/`);
    if (group?.perimetre) {
      perimeter = await fetchAPI<PortailDFPerimeter>(token, `/api/perimetres/${group.perimetre}/`);
    }
  }

  return { email, user, structure, group, perimeter };
}

// =============================================================================
// TEST CASE GENERATION
// =============================================================================

function getValidGeoCodes(perimeter: PortailDFPerimeter | null): string[] {
  if (!perimeter) return ['67482']; // Default Strasbourg

  if (perimeter.fr_entiere) return ['75056']; // Paris
  if (perimeter.comm.length > 0) return [perimeter.comm[0]];
  if (perimeter.dep.length > 0) return [`${perimeter.dep[0]}001`];
  if (perimeter.reg.length > 0) return ['67482']; // Default for region

  return ['67482'];
}

function getInvalidGeoCodes(perimeter: PortailDFPerimeter | null): string[] {
  if (!perimeter) return ['13055']; // Marseille

  if (perimeter.fr_entiere) return []; // Impossible d'avoir un périmètre invalide

  // Choisir un geo_code qui n'est PAS dans le périmètre
  if (perimeter.dep.includes('67')) return ['13055']; // Marseille
  if (perimeter.dep.includes('50')) return ['67482']; // Strasbourg
  if (perimeter.dep.includes('13')) return ['67482']; // Strasbourg

  return ['13055']; // Default Marseille
}

function generateTestCases(userData: FullUserData): { login: TestCase[]; createAccount: TestCase[] } {
  const perimeter = userData.perimeter;
  const validGeoCodes = getValidGeoCodes(perimeter);
  const invalidGeoCodes = getInvalidGeoCodes(perimeter);

  const loginTestCases: TestCase[] = [];
  const createAccountTestCases: TestCase[] = [];

  // ==========================================================================
  // CAS DE TEST CONNEXION (LOGIN)
  // L'utilisateur existe déjà en base ZLV
  // ==========================================================================

  // LOGIN-01: Utilisateur actif avec tous droits valides
  // NOTE: En seed, utilisez test.strasbourg@zlv.fr ou test.saintlo@zlv.fr pour ce cas
  loginTestCases.push({
    id: 'LOGIN-01',
    description: 'Utilisateur actif - tous droits valides',
    email: `test.strasbourg@zlv.fr`,
    establishmentName: 'Eurométropole de Strasbourg',
    geoCodes: validGeoCodes,
    perimeterValid: true,
    accessLevelValid: true,
    structureAccessValid: true,
    expectedSuspended: false,
    expectedCause: null,
    loginResult: 'OK',
    createAccountResult: 'OK',
    testType: 'login'
  });

  // LOGIN-02: Utilisateur suspendu - droits utilisateur expirés
  loginTestCases.push({
    id: 'LOGIN-02',
    description: 'Suspendu - droits utilisateur expirés',
    email: `test.suspended.user@zlv.fr`,
    establishmentName: 'Eurométropole de Strasbourg',
    geoCodes: validGeoCodes,
    perimeterValid: true,
    accessLevelValid: true,
    structureAccessValid: true,
    expectedSuspended: true,
    expectedCause: 'droits utilisateur expires',
    loginResult: 'SUSPENDED',
    createAccountResult: 'ERROR',
    testType: 'login'
  });

  // LOGIN-03: Utilisateur suspendu - droits structure expirés
  loginTestCases.push({
    id: 'LOGIN-03',
    description: 'Suspendu - droits structure expirés',
    email: `test.suspended.structure@zlv.fr`,
    establishmentName: 'Saint-Lô Agglo',
    geoCodes: validGeoCodes,
    perimeterValid: true,
    accessLevelValid: true,
    structureAccessValid: false,
    expectedSuspended: true,
    expectedCause: 'droits structure expires',
    loginResult: 'SUSPENDED',
    createAccountResult: 'ERROR',
    testType: 'login'
  });

  // LOGIN-04: Utilisateur suspendu - CGU non validées
  loginTestCases.push({
    id: 'LOGIN-04',
    description: 'Suspendu - CGU non validées',
    email: `test.suspended.cgu@zlv.fr`,
    establishmentName: 'Eurométropole de Strasbourg',
    geoCodes: validGeoCodes,
    perimeterValid: true,
    accessLevelValid: true,
    structureAccessValid: true,
    expectedSuspended: true,
    expectedCause: 'cgu vides',
    loginResult: 'SUSPENDED',
    createAccountResult: 'ERROR',
    testType: 'login'
  });

  // LOGIN-05: Utilisateur suspendu - niveau accès invalide
  loginTestCases.push({
    id: 'LOGIN-05',
    description: 'Suspendu - niveau accès invalide',
    email: `test.suspended.access@zlv.fr`,
    establishmentName: 'Eurométropole de Strasbourg',
    geoCodes: validGeoCodes,
    perimeterValid: true,
    accessLevelValid: false,
    structureAccessValid: true,
    expectedSuspended: true,
    expectedCause: 'niveau_acces_invalide',
    loginResult: 'SUSPENDED',
    createAccountResult: 'ERROR',
    testType: 'login'
  });

  // LOGIN-06: Utilisateur suspendu - périmètre invalide
  if (invalidGeoCodes.length > 0) {
    loginTestCases.push({
      id: 'LOGIN-06',
      description: 'Suspendu - périmètre invalide',
      email: `test.suspended.perimeter@zlv.fr`,
      establishmentName: 'Saint-Lô Agglo',
      geoCodes: invalidGeoCodes,
      perimeterValid: false,
      accessLevelValid: true,
      structureAccessValid: true,
      expectedSuspended: true,
      expectedCause: 'perimetre_invalide',
      loginResult: 'SUSPENDED',
      createAccountResult: 'ERROR',
      testType: 'login'
    });
  }

  // LOGIN-07: Utilisateur suspendu - multiple causes
  loginTestCases.push({
    id: 'LOGIN-07',
    description: 'Suspendu - multiple causes',
    email: `test.suspended.multiple@zlv.fr`,
    establishmentName: 'Saint-Lô Agglo',
    geoCodes: validGeoCodes,
    perimeterValid: true,
    accessLevelValid: true,
    structureAccessValid: true,
    expectedSuspended: true,
    expectedCause: 'droits utilisateur expires, droits structure expires, cgu vides',
    loginResult: 'SUSPENDED',
    createAccountResult: 'ERROR',
    testType: 'login'
  });

  // LOGIN-08: Utilisateur suspendu - niveau accès ET périmètre invalides
  if (invalidGeoCodes.length > 0) {
    loginTestCases.push({
      id: 'LOGIN-08',
      description: 'Suspendu - accès + périmètre invalides',
      email: `test.suspended.access.perimeter@zlv.fr`,
      establishmentName: 'Eurométropole de Strasbourg',
      geoCodes: invalidGeoCodes,
      perimeterValid: false,
      accessLevelValid: false,
      structureAccessValid: true,
      expectedSuspended: true,
      expectedCause: 'niveau_acces_invalide, perimetre_invalide',
      loginResult: 'SUSPENDED',
      createAccountResult: 'ERROR',
      testType: 'login'
    });
  }

  // LOGIN-09: Compte supprimé (deletedAt défini)
  // NOTE: Ce cas n'est pas encore implémenté dans les seeds
  loginTestCases.push({
    id: 'LOGIN-09',
    description: 'Compte supprimé',
    email: `test.deleted@zlv.fr`,
    establishmentName: 'Eurométropole de Strasbourg',
    geoCodes: validGeoCodes,
    perimeterValid: true,
    accessLevelValid: true,
    structureAccessValid: true,
    expectedSuspended: false,
    expectedCause: null,
    loginResult: 'FORBIDDEN',
    createAccountResult: 'OK',
    testType: 'login'
  });

  // ==========================================================================
  // CAS DE TEST CRÉATION DE COMPTE (CREATE ACCOUNT)
  // Le prospect existe dans Portail DF, un signup link a été généré
  // ==========================================================================

  // CREATE-01: Création compte - tous droits valides
  createAccountTestCases.push({
    id: 'CREATE-01',
    description: 'Création - tous droits valides',
    email: `test.create.valid@zlv.fr`,
    establishmentName: 'Test Create - Tous Droits Valides',
    geoCodes: validGeoCodes,
    perimeterValid: true,
    accessLevelValid: true,
    structureAccessValid: true,
    expectedSuspended: false,
    expectedCause: null,
    loginResult: 'OK',
    createAccountResult: 'OK',
    testType: 'create_account'
  });

  // CREATE-02: Création compte - niveau accès invalide (bloqué)
  createAccountTestCases.push({
    id: 'CREATE-02',
    description: 'Création - niveau accès invalide (BLOQUÉ)',
    email: `test.create.invalid.access@zlv.fr`,
    establishmentName: 'Test Create - Accès Invalide',
    geoCodes: validGeoCodes,
    perimeterValid: true,
    accessLevelValid: false,
    structureAccessValid: true,
    expectedSuspended: false,
    expectedCause: 'niveau_acces_invalide',
    loginResult: 'SUSPENDED',
    createAccountResult: 'ERROR',
    testType: 'create_account'
  });

  // CREATE-03: Création compte - périmètre invalide (bloqué)
  if (invalidGeoCodes.length > 0) {
    createAccountTestCases.push({
      id: 'CREATE-03',
      description: 'Création - périmètre invalide (BLOQUÉ)',
      email: `test.create.invalid.perimeter@zlv.fr`,
      establishmentName: 'Test Create - Périmètre Invalide',
      geoCodes: invalidGeoCodes,
      perimeterValid: false,
      accessLevelValid: true,
      structureAccessValid: true,
      expectedSuspended: false,
      expectedCause: 'perimetre_invalide',
      loginResult: 'SUSPENDED',
      createAccountResult: 'ERROR',
      testType: 'create_account'
    });
  }

  // CREATE-04: Création compte - accès ET périmètre invalides (bloqué)
  if (invalidGeoCodes.length > 0) {
    createAccountTestCases.push({
      id: 'CREATE-04',
      description: 'Création - accès + périmètre invalides (BLOQUÉ)',
      email: `test.create.invalid.both@zlv.fr`,
      establishmentName: 'Test Create - Accès + Périmètre Invalides',
      geoCodes: invalidGeoCodes,
      perimeterValid: false,
      accessLevelValid: false,
      structureAccessValid: true,
      expectedSuspended: false,
      expectedCause: 'niveau_acces_invalide, perimetre_invalide',
      loginResult: 'SUSPENDED',
      createAccountResult: 'ERROR',
      testType: 'create_account'
    });
  }

  // CREATE-05: Création compte - droits structure expirés
  createAccountTestCases.push({
    id: 'CREATE-05',
    description: 'Création - droits structure expirés (BLOQUÉ)',
    email: `test.create.expired.structure@zlv.fr`,
    establishmentName: 'Test Create - Structure Expirée',
    geoCodes: validGeoCodes,
    perimeterValid: true,
    accessLevelValid: true,
    structureAccessValid: false,
    expectedSuspended: false,
    expectedCause: 'droits structure expires',
    loginResult: 'SUSPENDED',
    createAccountResult: 'ERROR',
    testType: 'create_account'
  });

  // CREATE-06: Création compte - CGU non validées
  createAccountTestCases.push({
    id: 'CREATE-06',
    description: 'Création - CGU non validées (BLOQUÉ)',
    email: `test.create.cgu.empty@zlv.fr`,
    establishmentName: 'Test Create - CGU Vides',
    geoCodes: validGeoCodes,
    perimeterValid: true,
    accessLevelValid: true,
    structureAccessValid: true,
    expectedSuspended: false,
    expectedCause: 'cgu vides',
    loginResult: 'SUSPENDED',
    createAccountResult: 'ERROR',
    testType: 'create_account'
  });

  // CREATE-07: Création compte - droits utilisateur expirés
  createAccountTestCases.push({
    id: 'CREATE-07',
    description: 'Création - droits utilisateur expirés (BLOQUÉ)',
    email: `test.create.expired.user@zlv.fr`,
    establishmentName: 'Test Create - Utilisateur Expiré',
    geoCodes: validGeoCodes,
    perimeterValid: true,
    accessLevelValid: true,
    structureAccessValid: true,
    expectedSuspended: false,
    expectedCause: 'droits utilisateur expires',
    loginResult: 'SUSPENDED',
    createAccountResult: 'ERROR',
    testType: 'create_account'
  });

  return { login: loginTestCases, createAccount: createAccountTestCases };
}

// =============================================================================
// OUTPUT
// =============================================================================

function printSummaryTable(loginTestCases: TestCase[], createAccountTestCases: TestCase[]): void {
  // ==========================================================================
  // TABLEAU DES CAS DE TEST - CONNEXION
  // ==========================================================================
  console.log('\n' + '='.repeat(130));
  console.log('📊 CAS DE TEST - CONNEXION (utilisateur existant)');
  console.log('='.repeat(130));

  console.log('\n┌──────────┬─────────────────────────────────────────┬───────────┬───────────┬───────────┬────────────┬────────────┬───────────────────────────────────────┐');
  console.log('│ ID       │ Description                             │ Périmètre │ Niv.Accès │ Structure │ Suspendu   │ Résultat   │ Cause                                 │');
  console.log('├──────────┼─────────────────────────────────────────┼───────────┼───────────┼───────────┼────────────┼────────────┼───────────────────────────────────────┤');

  for (const tc of loginTestCases) {
    const id = tc.id.padEnd(8);
    const desc = tc.description.padEnd(39).substring(0, 39);
    const peri = (tc.perimeterValid ? '✅' : '❌').padEnd(9);
    const access = (tc.accessLevelValid ? '✅' : '❌').padEnd(9);
    const struct = (tc.structureAccessValid ? '✅' : '❌').padEnd(9);
    const susp = (tc.expectedSuspended ? '🔴 OUI' : '🟢 NON').padEnd(10);
    const result = tc.loginResult.padEnd(10);
    const cause = (tc.expectedCause || '-').padEnd(37).substring(0, 37);

    console.log(`│ ${id} │ ${desc} │ ${peri} │ ${access} │ ${struct} │ ${susp} │ ${result} │ ${cause} │`);
  }

  console.log('└──────────┴─────────────────────────────────────────┴───────────┴───────────┴───────────┴────────────┴────────────┴───────────────────────────────────────┘');

  // ==========================================================================
  // TABLEAU DES CAS DE TEST - CRÉATION DE COMPTE
  // ==========================================================================
  console.log('\n' + '='.repeat(130));
  console.log('📊 CAS DE TEST - CRÉATION DE COMPTE (prospect + signup link)');
  console.log('='.repeat(130));

  console.log('\n┌──────────┬─────────────────────────────────────────┬───────────┬───────────┬───────────┬────────────┬───────────────────────────────────────┐');
  console.log('│ ID       │ Description                             │ Périmètre │ Niv.Accès │ Structure │ Résultat   │ Cause                                 │');
  console.log('├──────────┼─────────────────────────────────────────┼───────────┼───────────┼───────────┼────────────┼───────────────────────────────────────┤');

  for (const tc of createAccountTestCases) {
    const id = tc.id.padEnd(8);
    const desc = tc.description.padEnd(39).substring(0, 39);
    const peri = (tc.perimeterValid ? '✅' : '❌').padEnd(9);
    const access = (tc.accessLevelValid ? '✅' : '❌').padEnd(9);
    const struct = (tc.structureAccessValid ? '✅' : '❌').padEnd(9);
    const result = tc.createAccountResult.padEnd(10);
    const cause = (tc.expectedCause || '-').padEnd(37).substring(0, 37);

    console.log(`│ ${id} │ ${desc} │ ${peri} │ ${access} │ ${struct} │ ${result} │ ${cause} │`);
  }

  console.log('└──────────┴─────────────────────────────────────────┴───────────┴───────────┴───────────┴────────────┴───────────────────────────────────────┘');

  console.log(`
📖 LÉGENDE:
  - Périmètre: Périmètre géographique correspond à l'établissement ZLV
  - Niv.Accès: niveau_acces = 'lovac' OU lovac = true dans le groupe Portail DF
  - Structure: acces_lovac de la structure est dans le futur

  CONNEXION:
  - Suspendu: L'utilisateur a suspendedAt défini en base
  - Résultat:
    - OK: Connexion réussie, accès normal
    - SUSPENDED: Connexion réussie mais modal de suspension affiché
    - FORBIDDEN: Connexion refusée (compte supprimé, HTTP 403)

  CRÉATION DE COMPTE:
  - Résultat:
    - OK: Compte créé avec succès
    - ERROR: Création bloquée (erreur retournée au frontend)
  `);
}

function printSeedCode(loginTestCases: TestCase[], createAccountTestCases: TestCase[], userData: FullUserData): void {
  const siren = userData.structure.siret.substring(0, 9);

  console.log('\n' + '='.repeat(130));
  console.log('📝 CODE SEED À COPIER');
  console.log('='.repeat(130));

  // ==========================================================================
  // ÉTABLISSEMENTS
  // ==========================================================================
  console.log(`
// =============================================================================
// ÉTABLISSEMENTS DE TEST - À ajouter dans 20240404235442_establishments.ts
// Basé sur: ${userData.email} / Structure: ${userData.structure.nom}
// =============================================================================

// SIREN de référence pour les tests
export const SirenTest = '${siren}';

// Établissements pour les cas de test de CONNEXION
`);

  // Grouper par nom d'établissement unique pour éviter les doublons
  const allTestCases = [...loginTestCases, ...createAccountTestCases];
  const uniqueEstablishments = new Map<string, TestCase>();
  for (const tc of allTestCases) {
    if (!uniqueEstablishments.has(tc.establishmentName)) {
      uniqueEstablishments.set(tc.establishmentName, tc);
    }
  }

  for (const [name, tc] of uniqueEstablishments) {
    console.log(`
// Établissement pour: ${tc.id}
export const ${tc.id.replace('-', '')}EstablishmentId = faker.string.uuid();
await Establishments(knex).insert({
  id: ${tc.id.replace('-', '')}EstablishmentId,
  name: '${name}',
  siren: Number('${siren}'),
  available: true,
  localities_geo_code: [${tc.geoCodes.map(c => `'${c}'`).join(', ')}],
  kind: 'Commune',
  source: 'seed',
  updated_at: new Date()
}).onConflict('name').ignore();
`);
  }

  // ==========================================================================
  // UTILISATEURS POUR CONNEXION
  // ==========================================================================
  console.log(`
// =============================================================================
// UTILISATEURS DE TEST (CONNEXION) - À ajouter dans 20240404235457_users.ts
// Ces utilisateurs existent en base pour tester la connexion
// =============================================================================
`);

  for (const tc of loginTestCases) {
    const suspendedAt = tc.expectedSuspended ? 'now' : 'null';
    const suspendedCause = tc.expectedCause ? `'${tc.expectedCause}'` : 'null';
    const deletedAt = tc.loginResult === 'FORBIDDEN' ? 'now' : 'null';

    console.log(`
// ${tc.id}: ${tc.description}
createBaseUser({
  email: '${tc.email}',
  password: hashedPassword,
  firstName: 'Test Login',
  lastName: '${tc.description.substring(0, 25)}',
  establishmentId: ${tc.id.replace('-', '')}EstablishmentId,
  activatedAt: now,
  role: UserRole.USUAL,
  suspendedAt: ${suspendedAt},
  suspendedCause: ${suspendedCause},
  deletedAt: ${deletedAt}
}),`);
  }

  // ==========================================================================
  // PROSPECTS ET SIGNUP LINKS POUR CRÉATION DE COMPTE
  // ==========================================================================
  console.log(`

// =============================================================================
// PROSPECTS DE TEST (CRÉATION DE COMPTE) - À ajouter dans un nouveau seed
// Ces prospects sont utilisés pour tester la création de compte
// =============================================================================

import { Prospects } from '~/repositories/prospectRepository';
import { SignupLinks } from '~/repositories/signupLinkRepository';

const futureDate = new Date();
futureDate.setDate(futureDate.getDate() + 7); // Expire dans 7 jours

// Insertion des prospects
await Prospects(knex).insert([
`);

  for (const tc of createAccountTestCases) {
    console.log(`  // ${tc.id}: ${tc.description}
  {
    email: '${tc.email}',
    establishment_siren: Number('${siren}'),
    has_account: false,
    has_commitment: true,
    last_account_request_at: new Date()
  },`);
  }

  console.log(`]).onConflict('email').ignore();

// Insertion des signup links
await SignupLinks(knex).insert([
`);

  for (const tc of createAccountTestCases) {
    const linkId = tc.id.toLowerCase().replace('-', '_');
    console.log(`  // ${tc.id}: ${tc.description}
  {
    id: '${linkId}_signup_link',
    prospect_email: '${tc.email}',
    expires_at: futureDate
  },`);
  }

  console.log(`]).onConflict('id').ignore();
`);

  // ==========================================================================
  // INSTRUCTIONS DE TEST
  // ==========================================================================
  console.log(`

// =============================================================================
// 🧪 INSTRUCTIONS DE TEST MANUEL
// =============================================================================

/*
TESTS DE CONNEXION:
-------------------
Pour chaque utilisateur LOGIN-XX, effectuer les étapes suivantes:

1. Aller sur la page de connexion: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/connexion
2. Entrer l'email: test.suspended.xxx@zlv.fr (ou test.strasbourg@zlv.fr pour LOGIN-01)
3. Entrer le mot de passe: (défini par TEST_PASSWORD dans .env)
4. Vérifier le résultat attendu:
   - OK: Accès normal au tableau de bord
   - SUSPENDED: Connexion RÉUSSIE mais modal de suspension affiché avec la cause appropriée
   - FORBIDDEN: Connexion refusée (compte supprimé, HTTP 403)

TESTS DE CRÉATION DE COMPTE:
----------------------------
Pour chaque prospect CREATE-XX, effectuer les étapes suivantes:

1. Accéder au lien de création de compte:
   ${process.env.FRONTEND_URL || 'http://localhost:3000'}/inscription/{signup_link_id}

2. Remplir le formulaire avec:
   - Email: test.create.xxx@zlv.fr
   - Mot de passe: (votre choix)

3. Vérifier le résultat attendu:
   - OK: Compte créé avec succès, redirection vers le tableau de bord
   - ERROR: Message d'erreur affiché, compte non créé

LIENS DE SIGNUP GÉNÉRÉS:
`);

  for (const tc of createAccountTestCases) {
    const linkId = tc.id.toLowerCase().replace('-', '_');
    console.log(`   ${tc.id}: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/inscription/${linkId}_signup_link`);
  }

  console.log(`
*/
`);
}

// =============================================================================
// MAIN
// =============================================================================

async function main(): Promise<void> {
  console.log('🔐 Authentification Portail DF...');
  const token = await authenticate();
  if (!token) {
    console.error('❌ Échec authentification');
    process.exit(1);
  }
  console.log('✅ Authentifié\n');

  const email = process.argv[2] || 'test.strasbourg@zlv.fr';
  console.log(`📧 Récupération données pour: ${email}`);

  const userData = await fetchUserData(token, email);
  if (!userData) {
    console.error('❌ Utilisateur non trouvé sur Portail DF');
    console.log('\n💡 Cet utilisateur existe peut-être uniquement en base ZLV (seed)');
    console.log('   Essayez avec un email réel de Portail DF');
    process.exit(1);
  }

  console.log(`\n📦 Structure: ${userData.structure.nom}`);
  console.log(`   SIREN: ${userData.structure.siret.substring(0, 9)}`);
  console.log(`   acces_lovac: ${userData.structure.acces_lovac || 'NULL'}`);

  if (userData.group) {
    console.log(`👥 Groupe: ${userData.group.nom}`);
    console.log(`   niveau_acces: ${userData.group.niveau_acces}`);
    console.log(`   lovac: ${userData.group.lovac}`);
  }

  if (userData.perimeter) {
    console.log(`🗺️ Périmètre:`);
    console.log(`   fr_entiere: ${userData.perimeter.fr_entiere}`);
    if (userData.perimeter.reg.length) console.log(`   reg: [${userData.perimeter.reg.join(', ')}]`);
    if (userData.perimeter.dep.length) console.log(`   dep: [${userData.perimeter.dep.join(', ')}]`);
    if (userData.perimeter.epci.length) console.log(`   epci: [${userData.perimeter.epci.join(', ')}]`);
    if (userData.perimeter.comm.length) console.log(`   comm: [${userData.perimeter.comm.join(', ')}]`);
  }

  const { login: loginTestCases, createAccount: createAccountTestCases } = generateTestCases(userData);

  console.log(`\n📊 Cas de test générés:`);
  console.log(`   - Connexion: ${loginTestCases.length} cas`);
  console.log(`   - Création de compte: ${createAccountTestCases.length} cas`);

  printSummaryTable(loginTestCases, createAccountTestCases);
  printSeedCode(loginTestCases, createAccountTestCases, userData);

  console.log('\n' + '='.repeat(130));
  console.log('✅ Génération terminée');
  console.log('='.repeat(130));
}

main().catch(console.error);
