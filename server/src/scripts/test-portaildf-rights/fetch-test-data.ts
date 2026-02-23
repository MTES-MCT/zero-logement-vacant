/**
 * Script pour récupérer les données de test depuis Portail DF
 * et générer les seeds appropriés pour tester les erreurs de périmètre
 *
 * Usage:
 *   npx tsx server/src/scripts/test-portaildf-rights/fetch-test-data.ts [email]
 *
 * Exemples:
 *   npx tsx server/src/scripts/test-portaildf-rights/fetch-test-data.ts test.strasbourg@zlv.fr
 *   npx tsx server/src/scripts/test-portaildf-rights/fetch-test-data.ts
 */

import 'dotenv/config';

const config = {
  cerema: {
    api: process.env.CEREMA_API || 'https://portaildf.cerema.fr',
    username: process.env.CEREMA_USERNAME || '',
    password: process.env.CEREMA_PASSWORD || ''
  }
};

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

async function authenticate(): Promise<string | null> {
  console.log('🔐 Authentification...');

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

  if (!response.ok) {
    console.error('❌ Échec authentification');
    return null;
  }

  const data = await response.json() as { token: string };
  console.log('✅ Authentifié');
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
  console.log(`\n📧 Récupération données pour: ${email}`);

  // Get user
  const userResponse = await fetchAPI<{ count: number; results: PortailDFUser[] }>(
    token,
    `/api/utilisateurs/?email=${encodeURIComponent(email)}`
  );

  if (!userResponse || userResponse.count === 0) {
    console.log('  ❌ Utilisateur non trouvé');
    return null;
  }

  const user = userResponse.results[0];
  console.log(`  ✅ Utilisateur trouvé (structure: ${user.structure}, groupe: ${user.groupe})`);

  // Get structure
  const structure = await fetchAPI<PortailDFStructure>(
    token,
    `/api/structures/${user.structure}/`
  );

  if (!structure) {
    console.log('  ❌ Structure non trouvée');
    return null;
  }

  console.log(`  📦 Structure: ${structure.nom} (SIREN: ${structure.siret.substring(0, 9)})`);
  console.log(`     acces_lovac: ${structure.acces_lovac}`);

  // Get group
  let group: PortailDFGroup | null = null;
  let perimeter: PortailDFPerimeter | null = null;

  if (user.groupe) {
    group = await fetchAPI<PortailDFGroup>(token, `/api/groupes/${user.groupe}/`);
    if (group) {
      console.log(`  👥 Groupe: ${group.nom}`);
      console.log(`     niveau_acces: ${group.niveau_acces}`);
      console.log(`     lovac: ${group.lovac}`);

      if (group.perimetre) {
        perimeter = await fetchAPI<PortailDFPerimeter>(
          token,
          `/api/perimetres/${group.perimetre}/`
        );
        if (perimeter) {
          console.log(`  🗺️ Périmètre:`);
          console.log(`     fr_entiere: ${perimeter.fr_entiere}`);
          console.log(`     reg: [${perimeter.reg.join(', ')}]`);
          console.log(`     dep: [${perimeter.dep.join(', ')}]`);
          console.log(`     epci: [${perimeter.epci.join(', ')}]`);
          console.log(`     comm: [${perimeter.comm.join(', ')}]`);
        }
      }
    }
  }

  return { email, user, structure, group, perimeter };
}

function generateTestEstablishments(userData: FullUserData): void {
  console.log('\n' + '='.repeat(80));
  console.log('📝 GÉNÉRATION DES ÉTABLISSEMENTS DE TEST');
  console.log('='.repeat(80));

  const siren = userData.structure.siret.substring(0, 9);
  const perimeter = userData.perimeter;

  console.log(`\nUtilisateur: ${userData.email}`);
  console.log(`SIREN structure: ${siren}`);

  if (!perimeter) {
    console.log('⚠️ Pas de périmètre, impossible de générer des tests');
    return;
  }

  // Déterminer les geo_codes valides et invalides
  let validGeoCodes: string[] = [];
  let invalidGeoCodes: string[] = [];

  if (perimeter.fr_entiere) {
    console.log('✅ France entière - tout périmètre est valide');
    validGeoCodes = ['75056']; // Paris
    // Pour tester fr_entiere, on ne peut pas créer d'invalide côté périmètre
  } else if (perimeter.dep.length > 0) {
    // Périmètre départemental
    const dept = perimeter.dep[0];
    validGeoCodes = [`${dept}001`, `${dept}002`]; // Communes du département
    // Département invalide (différent)
    const invalidDept = dept === '67' ? '68' : '67';
    invalidGeoCodes = [`${invalidDept}001`, `${invalidDept}002`];
    console.log(`📍 Périmètre départemental: ${dept}`);
  } else if (perimeter.reg.length > 0) {
    // Périmètre régional
    const reg = perimeter.reg[0];
    console.log(`📍 Périmètre régional: ${reg}`);
    // Nécessite un mapping région -> département
    validGeoCodes = ['67482']; // Strasbourg si région Grand Est
    invalidGeoCodes = ['13055']; // Marseille (autre région)
  } else if (perimeter.epci.length > 0) {
    console.log(`📍 Périmètre EPCI: ${perimeter.epci.join(', ')}`);
    // EPCI = SIREN, nécessite une table de mapping EPCI -> communes
    validGeoCodes = ['67482'];
    invalidGeoCodes = ['13055'];
  } else if (perimeter.comm.length > 0) {
    validGeoCodes = perimeter.comm;
    // Commune invalide (différente)
    invalidGeoCodes = perimeter.comm[0] === '67482' ? ['13055'] : ['67482'];
    console.log(`📍 Périmètre communal: ${perimeter.comm.join(', ')}`);
  }

  console.log(`\n✅ Geo codes valides: [${validGeoCodes.join(', ')}]`);
  console.log(`❌ Geo codes invalides: [${invalidGeoCodes.join(', ')}]`);

  // Générer le code seed
  console.log('\n' + '-'.repeat(80));
  console.log('📋 CODE À AJOUTER DANS LES SEEDS:');
  console.log('-'.repeat(80));

  const hasValidLovac = userData.group?.niveau_acces === 'lovac' || userData.group?.lovac === true;

  console.log(`
// ============================================================================
// ÉTABLISSEMENTS DE TEST POUR VÉRIFICATION PÉRIMÈTRE
// Basé sur les données de: ${userData.email}
// Structure Portail DF: ${userData.structure.nom} (SIREN: ${siren})
// ============================================================================

// Établissement avec périmètre VALIDE (devrait fonctionner)
export const TestEstablishmentValidPerimeter = {
  id: faker.string.uuid(),
  name: 'Test - Périmètre Valide',
  siren: Number('${siren}'), // Même SIREN que la structure Portail DF
  available: true,
  localities_geo_code: [${validGeoCodes.map(c => `'${c}'`).join(', ')}],
  kind: 'Commune' as const,
  source: 'seed' as const,
  updated_at: new Date()
};

// Établissement avec périmètre INVALIDE (devrait échouer avec perimetre_invalide)
export const TestEstablishmentInvalidPerimeter = {
  id: faker.string.uuid(),
  name: 'Test - Périmètre Invalide',
  siren: Number('${siren}'), // Même SIREN mais geo_codes hors périmètre
  available: true,
  localities_geo_code: [${invalidGeoCodes.map(c => `'${c}'`).join(', ')}],
  kind: 'Commune' as const,
  source: 'seed' as const,
  updated_at: new Date()
};

// Données Portail DF pour référence:
// - Groupe: ${userData.group?.nom || 'N/A'}
// - niveau_acces: ${userData.group?.niveau_acces || 'N/A'}
// - lovac: ${userData.group?.lovac ?? 'N/A'}
// - Périmètre fr_entiere: ${perimeter.fr_entiere}
// - Périmètre reg: [${perimeter.reg.join(', ')}]
// - Périmètre dep: [${perimeter.dep.join(', ')}]
// - Périmètre epci: [${perimeter.epci.join(', ')}]
// - Périmètre comm: [${perimeter.comm.join(', ')}]
`);

  // Générer les utilisateurs de test associés
  console.log(`
// UTILISATEURS DE TEST ASSOCIÉS
// À ajouter dans le seed des users:

// Utilisateur avec périmètre valide (pas de suspension)
createBaseUser({
  email: 'test.perimeter.valid@zlv.fr',
  password: hashedPassword,
  firstName: 'Test',
  lastName: 'Périmètre Valide',
  establishmentId: TestEstablishmentValidPerimeter.id,
  activatedAt: now,
  role: UserRole.USUAL,
  suspendedAt: null,
  suspendedCause: null
}),

// Utilisateur avec périmètre invalide (suspendu)
createBaseUser({
  email: 'test.perimeter.invalid@zlv.fr',
  password: hashedPassword,
  firstName: 'Test',
  lastName: 'Périmètre Invalide',
  establishmentId: TestEstablishmentInvalidPerimeter.id,
  activatedAt: now,
  role: UserRole.USUAL,
  suspendedAt: now,
  suspendedCause: 'perimetre_invalide'
}),
`);

  if (!hasValidLovac) {
    console.log(`
// ⚠️ ATTENTION: L'utilisateur n'a PAS d'accès LOVAC valide
// niveau_acces: ${userData.group?.niveau_acces}
// lovac: ${userData.group?.lovac}
// Les tests de périmètre échoueront aussi avec niveau_acces_invalide
`);
  }
}

async function main(): Promise<void> {
  console.log('='.repeat(80));
  console.log('🔍 RÉCUPÉRATION DES DONNÉES PORTAIL DF POUR TESTS');
  console.log('='.repeat(80));

  const token = await authenticate();
  if (!token) {
    process.exit(1);
  }

  const email = process.argv[2];

  if (email) {
    const userData = await fetchUserData(token, email);
    if (userData) {
      generateTestEstablishments(userData);
    }
  } else {
    // Tester plusieurs emails
    const testEmails = [
      'test.strasbourg@zlv.fr',
      'test.saintlo@zlv.fr',
    ];

    console.log('\n📋 Emails à tester:');
    testEmails.forEach(e => console.log(`  - ${e}`));

    for (const testEmail of testEmails) {
      const userData = await fetchUserData(token, testEmail);
      if (userData) {
        generateTestEstablishments(userData);
      }
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ Terminé');
  console.log('='.repeat(80));
}

main().catch(console.error);
