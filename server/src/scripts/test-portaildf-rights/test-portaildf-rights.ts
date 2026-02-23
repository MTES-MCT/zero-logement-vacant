/**
 * Script de test temporaire pour vérifier les droits Portail DF
 *
 * Ce script teste les différents cas d'erreurs possibles :
 * - Connexion avec utilisateur suspendu (différentes causes)
 * - Création de compte avec droits invalides
 * - Vérification du niveau d'accès LOVAC
 * - Vérification du périmètre géographique
 *
 * Usage:
 *   npx tsx server/src/scripts/test-portaildf-rights/test-portaildf-rights.ts
 *
 * Environnement requis:
 *   DATABASE_URL - URL de connexion à la base de données staging
 *   CEREMA_USERNAME - Identifiant Portail DF
 *   CEREMA_PASSWORD - Mot de passe Portail DF
 *   CEREMA_API - URL de l'API Portail DF (https://portaildf.cerema.fr)
 */

import 'dotenv/config';

// Configuration manuelle si les variables d'environnement ne sont pas chargées
const config = {
  cerema: {
    api: process.env.CEREMA_API || 'https://portaildf.cerema.fr',
    username: process.env.CEREMA_USERNAME || '',
    password: process.env.CEREMA_PASSWORD || ''
  }
};

interface CeremaGroup {
  id_groupe: number;
  nom: string;
  structure: number;
  perimetre: number;
  niveau_acces: string;
  df_ano: boolean;
  df_non_ano: boolean;
  lovac: boolean;
}

interface CeremaPerimeter {
  perimetre_id: number;
  origine: string;
  fr_entiere: boolean;
  reg: string[];
  dep: string[];
  epci: string[];
  comm: string[];
}

interface CeremaUserResult {
  email: string;
  structure: number;
  groupe: number;
  structureData?: {
    siret: string;
    nom: string;
    acces_lovac: string | null;
  };
  groupData?: CeremaGroup;
  perimeterData?: CeremaPerimeter;
}

interface PortailDFApiResponse {
  count: number;
  results: Array<{
    email: string;
    structure: number;
    groupe: number;
  }>;
}

// =============================================================================
// PORTAIL DF API FUNCTIONS
// =============================================================================

async function authenticatePortailDF(): Promise<string | null> {
  console.log('\n🔐 Authentification Portail DF...');

  if (!config.cerema.username || !config.cerema.password) {
    console.error('❌ CEREMA_USERNAME et CEREMA_PASSWORD sont requis');
    return null;
  }

  try {
    const formData = new FormData();
    formData.append('username', config.cerema.username);
    formData.append('password', config.cerema.password);

    const response = await fetch(`${config.cerema.api}/api/api-token-auth/`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      console.error(`❌ Échec authentification: ${response.status}`);
      return null;
    }

    const data = await response.json() as { token: string };
    console.log('✅ Authentification réussie');
    return data.token;
  } catch (error) {
    console.error('❌ Erreur authentification:', error);
    return null;
  }
}

async function fetchFromPortailDF<T>(token: string, endpoint: string): Promise<T | null> {
  try {
    const response = await fetch(`${config.cerema.api}${endpoint}`, {
      method: 'GET',
      headers: {
        'Authorization': `Token ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.warn(`  ⚠️ Échec ${endpoint}: ${response.status}`);
      return null;
    }

    return await response.json() as T;
  } catch (error) {
    console.error(`  ❌ Erreur ${endpoint}:`, error);
    return null;
  }
}

async function getUserInfoFromPortailDF(token: string, email: string): Promise<CeremaUserResult[]> {
  console.log(`\n📧 Recherche utilisateur: ${email}`);

  const userResponse = await fetchFromPortailDF<PortailDFApiResponse>(
    token,
    `/api/utilisateurs/?email=${encodeURIComponent(email)}`
  );

  if (!userResponse || userResponse.count === 0) {
    console.log('  ❌ Aucun utilisateur trouvé sur Portail DF');
    return [];
  }

  console.log(`  ✅ ${userResponse.count} compte(s) trouvé(s)`);

  const results: CeremaUserResult[] = [];

  for (const user of userResponse.results) {
    const result: CeremaUserResult = {
      email: user.email,
      structure: user.structure,
      groupe: user.groupe
    };

    // Fetch structure data
    console.log(`  📦 Structure ${user.structure}...`);
    const structureData = await fetchFromPortailDF<{
      siret: string;
      nom: string;
      acces_lovac: string | null;
    }>(token, `/api/structures/${user.structure}/`);

    if (structureData) {
      result.structureData = structureData;
      console.log(`     SIREN: ${structureData.siret.substring(0, 9)}`);
      console.log(`     Nom: ${structureData.nom}`);
      console.log(`     acces_lovac: ${structureData.acces_lovac || 'NULL'}`);

      // Check if acces_lovac is valid
      if (structureData.acces_lovac) {
        const accessDate = new Date(structureData.acces_lovac);
        const now = new Date();
        const isValid = accessDate > now;
        console.log(`     Date valide: ${isValid ? '✅ OUI' : '❌ NON (expirée)'}`);
      }
    }

    // Fetch group data
    if (user.groupe) {
      console.log(`  👥 Groupe ${user.groupe}...`);
      const groupData = await fetchFromPortailDF<CeremaGroup>(
        token,
        `/api/groupes/${user.groupe}/`
      );

      if (groupData) {
        result.groupData = groupData;
        console.log(`     Nom: ${groupData.nom}`);
        console.log(`     niveau_acces: ${groupData.niveau_acces}`);
        console.log(`     lovac: ${groupData.lovac}`);
        console.log(`     df_ano: ${groupData.df_ano}`);
        console.log(`     df_non_ano: ${groupData.df_non_ano}`);

        // Check LOVAC access level
        const hasLovacAccess = groupData.niveau_acces === 'lovac' || groupData.lovac === true;
        console.log(`     Accès LOVAC valide: ${hasLovacAccess ? '✅ OUI' : '❌ NON'}`);

        // Fetch perimeter
        if (groupData.perimetre) {
          console.log(`  🗺️ Périmètre ${groupData.perimetre}...`);
          const perimeterData = await fetchFromPortailDF<CeremaPerimeter>(
            token,
            `/api/perimetres/${groupData.perimetre}/`
          );

          if (perimeterData) {
            result.perimeterData = perimeterData;
            console.log(`     fr_entiere: ${perimeterData.fr_entiere}`);
            console.log(`     reg: [${perimeterData.reg.join(', ')}]`);
            console.log(`     dep: [${perimeterData.dep.join(', ')}]`);
            console.log(`     epci: [${perimeterData.epci.join(', ')}]`);
            console.log(`     comm: [${perimeterData.comm.join(', ')}]`);
          }
        }
      }
    } else {
      console.log('  ⚠️ Aucun groupe associé');
    }

    results.push(result);
  }

  return results;
}

// =============================================================================
// TEST CASES
// =============================================================================

interface TestCase {
  name: string;
  email: string;
  description: string;
  expectedIssues?: string[];
}

const TEST_EMAILS: TestCase[] = [
  // Utilisateurs de test existants en staging/review
  {
    name: 'Test Strasbourg',
    email: 'test.strasbourg@zlv.fr',
    description: 'Utilisateur de test standard (seed)'
  },
  {
    name: 'Test Saint-Lô',
    email: 'test.saintlo@zlv.fr',
    description: 'Utilisateur de test standard (seed)'
  },
  // Ajouter ici des emails réels pour tester
  // {
  //   name: 'Utilisateur réel 1',
  //   email: 'email@example.fr',
  //   description: 'Test avec un utilisateur réel'
  // },
];

// =============================================================================
// ANALYSIS FUNCTIONS
// =============================================================================

function analyzeUserRights(results: CeremaUserResult[]): void {
  console.log('\n' + '='.repeat(80));
  console.log('📊 ANALYSE DES DROITS');
  console.log('='.repeat(80));

  for (const result of results) {
    console.log(`\n📧 ${result.email}`);

    const issues: string[] = [];

    // Check structure LOVAC access
    if (!result.structureData) {
      issues.push('Structure non trouvée');
    } else if (!result.structureData.acces_lovac) {
      issues.push('droits structure expires (acces_lovac NULL)');
    } else {
      const accessDate = new Date(result.structureData.acces_lovac);
      if (accessDate <= new Date()) {
        issues.push('droits structure expires (date expirée)');
      }
    }

    // Check group
    if (!result.groupData) {
      issues.push('Aucun groupe associé');
    } else {
      // Check LOVAC access level
      const hasLovacAccess = result.groupData.niveau_acces === 'lovac' || result.groupData.lovac === true;
      if (!hasLovacAccess) {
        issues.push('niveau_acces_invalide');
      }

      // Check perimeter
      if (!result.perimeterData) {
        issues.push('Périmètre non trouvé');
      } else if (!result.perimeterData.fr_entiere &&
                 result.perimeterData.reg.length === 0 &&
                 result.perimeterData.dep.length === 0 &&
                 result.perimeterData.epci.length === 0 &&
                 result.perimeterData.comm.length === 0) {
        issues.push('perimetre_invalide (vide)');
      }
    }

    if (issues.length === 0) {
      console.log('  ✅ Tous les droits sont valides');
    } else {
      console.log('  ❌ Problèmes détectés:');
      issues.forEach(issue => console.log(`     - ${issue}`));
      console.log(`  💡 Cause de suspension potentielle: "${issues.join(', ')}"`);
    }
  }
}

// =============================================================================
// MAIN
// =============================================================================

async function main(): Promise<void> {
  console.log('='.repeat(80));
  console.log('🧪 TEST DES DROITS PORTAIL DF');
  console.log('='.repeat(80));
  console.log(`API: ${config.cerema.api}`);
  console.log(`Username: ${config.cerema.username ? '***' : 'NON DÉFINI'}`);

  // Authenticate
  const token = await authenticatePortailDF();
  if (!token) {
    console.error('\n❌ Impossible de continuer sans authentification');
    process.exit(1);
  }

  // Get email from command line argument if provided
  const customEmail = process.argv[2];

  if (customEmail) {
    console.log(`\n🎯 Test avec email personnalisé: ${customEmail}`);
    const results = await getUserInfoFromPortailDF(token, customEmail);
    analyzeUserRights(results);
  } else {
    // Test all predefined emails
    console.log('\n📋 Emails à tester:');
    TEST_EMAILS.forEach(tc => console.log(`  - ${tc.email} (${tc.description})`));

    for (const testCase of TEST_EMAILS) {
      console.log('\n' + '-'.repeat(80));
      console.log(`🧪 ${testCase.name}: ${testCase.description}`);

      const results = await getUserInfoFromPortailDF(token, testCase.email);

      if (results.length === 0) {
        console.log('  ⚠️ Utilisateur non trouvé sur Portail DF');
        console.log('  💡 Cet utilisateur existe peut-être uniquement en base ZLV (seed)');
      } else {
        analyzeUserRights(results);
      }
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ Tests terminés');
  console.log('='.repeat(80));

  // Summary of suspension causes
  console.log(`
📖 RAPPEL DES CAUSES DE SUSPENSION:

  Existantes:
  - "droits utilisateur expires"  → Droits utilisateur expirés sur Portail DF
  - "droits structure expires"    → acces_lovac NULL ou date expirée
  - "cgu vides"                   → CGU non validées sur Portail DF

  Nouvelles (à implémenter côté sync):
  - "niveau_acces_invalide"       → niveau_acces != 'lovac' ET lovac != true
  - "perimetre_invalide"          → Périmètre géographique ne couvre pas l'établissement

📝 UTILISATION:

  # Tester un email spécifique:
  npx tsx server/src/scripts/test-portaildf-rights/test-portaildf-rights.ts email@example.fr

  # Tester les emails prédéfinis:
  npx tsx server/src/scripts/test-portaildf-rights/test-portaildf-rights.ts
`);
}

main().catch(console.error);
