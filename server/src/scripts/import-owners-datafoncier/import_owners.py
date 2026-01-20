#!/usr/bin/env python3
"""
Import owners from df_owners_nat_2024 to owners table.

This script imports owners that exist in the Datafoncier source table (df_owners_nat_2024)
but are not yet present in the ZLV owners table. Matching is done via the idpersonne field.

Field Mapping:
- id              -> uuid_generate_v4()
- full_name       -> ddenom (with '/' replaced by space for physical persons)
- birth_date      -> jdatnss (converted from DD/MM/YYYY to ISO format)
- address_dgfip   -> [dlign3, dlign4, dlign5, dlign6] (non-null values as array)
- kind_class      -> mapped from catpro2txt
- idpersonne      -> idpersonne
- siren           -> dsiren
- data_source     -> 'datafoncier-2024'
- entity          -> 'personnes-physiques'
- created_at      -> NOW()
- updated_at      -> NOW()

Usage:
    python import_owners.py --db-url "postgresql://user:pass@host:port/dbname"
    python import_owners.py --db-url "$DATABASE_URL" --dry-run --limit 1000
    python import_owners.py --db-url "$DATABASE_URL" --batch-size 10000 --num-workers 6
    python import_owners.py --db-url "$DATABASE_URL" --source-table df_owners_nat  # for older table
"""

import argparse
import logging
import threading
from datetime import datetime
from typing import List, Dict, Optional, Tuple
from concurrent.futures import ThreadPoolExecutor, as_completed

import psycopg2
from psycopg2.extras import RealDictCursor, execute_values
from tqdm import tqdm


# Kind mapping from catpro3txt (CATPRO 3 LOVAC ET FF) to ZLV kind_class
# Source: Classification CEREMA - effectif depuis S 2024
KIND_MAPPING = {
    # =========================================================================
    # X – PERSONNE PHYSIQUE
    # =========================================================================
    'PERSONNE PHYSIQUE': 'Particulier',

    # =========================================================================
    # P – ETAT ET COLLECTIVITE TERRITORIALE
    # =========================================================================
    'ETAT ETRANGER': 'Etat et collectivité territoriale',
    'ETAT FRANCAIS': 'Etat et collectivité territoriale',
    'REGION': 'Etat et collectivité territoriale',
    'DEPARTEMENT': 'Etat et collectivité territoriale',
    'INTERCOMMUNALITE': 'Etat et collectivité territoriale',
    'SYNDICAT INTERCOMMUNAL A VOCATION MULTIPLE': 'Etat et collectivité territoriale',
    'SYNDICAT MIXTE': 'Etat et collectivité territoriale',
    'SYNDICAT INTERCOMMUNAL AUTRE': 'Etat et collectivité territoriale',
    'COMMUNE': 'Etat et collectivité territoriale',
    'COLLECTIVITE TERRITORIALE SPECIFIQUE': 'Etat et collectivité territoriale',
    'COLLECTIVITE DE PARIS': 'Etat et collectivité territoriale',

    # =========================================================================
    # F – PROFESSIONNEL DU FONCIER ET IMMOBILIER
    # =========================================================================
    # Bailleur social, Aménageur, Investisseur public
    'ORGANISME DE LOGEMENT SOCIAL': 'Bailleur social, Aménageur, Investisseur public',
    'EPF – ETABLISSEMENT PUBLIC FONCIER D ETAT': 'Bailleur social, Aménageur, Investisseur public',
    'EPFL – ETABLISSEMENT PUBLIC FONCIER LOCAL': 'Bailleur social, Aménageur, Investisseur public',
    'SEM – SOCIETE D ECONOMIE MIXTE': 'Bailleur social, Aménageur, Investisseur public',
    'SPLA – SOCIETE PUBLIQUE LOCALE D AMENAGEMENT': 'Bailleur social, Aménageur, Investisseur public',
    'SEM OU SPLA INDETERMINE': 'Bailleur social, Aménageur, Investisseur public',
    'AMENAGEUR FONCIER': 'Bailleur social, Aménageur, Investisseur public',
    'EPA – ETABLISSEMENT PUBLIC D AMENAGEMENT': 'Bailleur social, Aménageur, Investisseur public',
    'INVESTISSEUR PUBLIC': 'Bailleur social, Aménageur, Investisseur public',
    'BANQUE PUBLIQUE': 'Bailleur social, Aménageur, Investisseur public',
    'CAISSE DES DEPOTS ET CONSIGNATIONS': 'Bailleur social, Aménageur, Investisseur public',

    # Promoteur, Investisseur privé
    'PROMOTEUR IMMOBILIER': 'Promoteur, Investisseur privé',
    'CONSTRUCTEUR': 'Promoteur, Investisseur privé',
    'SOCIETE CIVILE DE CONSTRUCTION VENTE': 'Promoteur, Investisseur privé',
    'INVESTISSEUR PRIVE': 'Promoteur, Investisseur privé',
    'BANQUE PRIVEE – CREDIT BAIL': 'Promoteur, Investisseur privé',
    'ASSURANCE OU MUTUELLE': 'Promoteur, Investisseur privé',
    'SOCIETE CIVILE DE PLACEMENT IMMOBILIER': 'Promoteur, Investisseur privé',

    # =========================================================================
    # G – ORGANISATION DE GESTION FONCIERE ET IMMOBILIERE
    # =========================================================================
    'SCI - SOCIETE CIVILE IMMOBILIERE': 'SCI, Copropriété, Autres personnes morales',
    'SOCIETE CIVILE A VOCATION DE CONSTRUCTION': 'SCI, Copropriété, Autres personnes morales',
    'SOCIETE CIVILE A VOCATION D INVESTISSEMENT': 'SCI, Copropriété, Autres personnes morales',
    'SOCIETE CIVILE AUTRE': 'SCI, Copropriété, Autres personnes morales',
    'COPROPRIETE': 'SCI, Copropriété, Autres personnes morales',
    'BND - PROPRIETAIRE EN BIENS NON DELIMITES': 'SCI, Copropriété, Autres personnes morales',
    'COPROPRIETE AUTRE': 'SCI, Copropriété, Autres personnes morales',
    'COPROPRIETE DE FAIT': 'SCI, Copropriété, Autres personnes morales',

    # =========================================================================
    # M – PERSONNE MORALE AUTRE
    # =========================================================================
    'PERSONNE MORALE AUTRE': 'SCI, Copropriété, Autres personnes morales',
    'PERSONNE MORALE PUBLIQUE AUTRE': 'SCI, Copropriété, Autres personnes morales',
    'PERSONNE MORALE NON CLASSEE': 'SCI, Copropriété, Autres personnes morales',

    # =========================================================================
    # A – PROPRIETAIRE ET EXPLOITANT DU FONCIER NATUREL AGRICOLE OU FORESTIER
    # =========================================================================
    'EXPLOITANT AGRICOLE': 'Autres',
    'SYNDICAT AGRICOLE': 'Autres',
    'COOPERATIVE AGRICOLE': 'Autres',
    'CHAMBRE D AGRICULTURE': 'Autres',
    'STRUCTURE VITICOLE': 'Autres',
    'GROUPEMENT FORESTIER': 'Autres',
    'ONF – OFFICE NATIONAL DES FORETS': 'Autres',
    'STRUCTURE FORESTIERE AUTRE': 'Autres',
    'CONSERVATOIRE DES ESPACES NATURELS': 'Autres',
    'PNR – PARC NATUREL REGIONAL': 'Autres',
    'AFB – AGENCE FRANCAISE DE LA BIODIVERSITE': 'Autres',
    'ONCFS – OFFICE NATIONAL DE LA CHASSE ET DE LA FAUNE SAUVAGE': 'Autres',
    'SYNDICAT DE GESTION HYDRAULIQUE': 'Autres',
    'CONSERVATOIRE DU LITTORAL': 'Autres',
    'ASSOCIATION DE CHASSE ET PECHE': 'Autres',
    'AGENCE DE L EAU': 'Autres',
    'SAFER – SOCIETE D AMENAGEMENT FONCIER ET D ETABLISSEMENT RURAL': 'Autres',
    'ASSOCIATION FONCIERE DE REMEMBREMENT': 'Autres',

    # =========================================================================
    # R – PROPRIETAIRE ET EXPLOITANT DE RESEAU
    # =========================================================================
    'CONCESSIONNAIRE AUTOROUTIER': 'Autres',
    'SNCF – SOCIETE NATIONALE DES CHEMINS DE FER FRANCAIS': 'Autres',
    'RATP – REGIE AUTONOME DES TRANSPORTS PARISIENS': 'Autres',
    'RESEAU FERRE AUTRE': 'Autres',
    'STRUCTURE AERIENNE': 'Autres',
    'SYNDICAT DE CANAL': 'Autres',
    'GRAND PORT MARITIME - PORT AUTONOME': 'Autres',
    'VNF – VOIES NAVIGABLES DE FRANCE': 'Autres',
    'STRUCTURE FLUVIALE OU MARITIME AUTRE': 'Autres',
    'EDF – GDF': 'Autres',
    'GESTIONNAIRE DE RESEAU ELECTRIQUE OU GAZ AUTRE': 'Autres',
    'GESTIONNAIRE DE RESEAU D EAU OU D ASSAINISSEMENT': 'Autres',
    'RESEAU DE TELECOMMUNICATION': 'Autres',
    'PROPRIETAIRE DE RESEAU AUTRE': 'Autres',

    # =========================================================================
    # E – ETABLISSEMENT D ENSEIGNEMENT D ETUDE ET DE RECHERCHE
    # =========================================================================
    'UNIVERSITE ET ENSEIGNEMENT SUPERIEUR': 'Autres',
    'IGN – INSTITUT GEOGRAPHIQUE NATIONAL': 'Autres',
    'CEA – COMMISSARIAT A L ENERGIE ATOMIQUE': 'Autres',
    'INRA – INSTITUT NATIONAL DE LA RECHERCHE AGRONOMIQUE': 'Autres',
    'CNES – CENTRE NATIONAL D ETUDES SPATIALES': 'Autres',
    'BRGM – BUREAU DE RECHERCHES GEOLOGIQUES ET MINIERES': 'Autres',
    'CNRS – CENTRE NATIONAL DE LA RECHERCHE SCIENTIFIQUE': 'Autres',
    'METEO FRANCE': 'Autres',
    'ADEME – AGENCE DE L ENVIRONNEMENT ET DE LA MAITRISE DE L ENERGIE': 'Autres',
    'ONERA – OFFICE NATIONAL D ETUDES ET DE RECHERCHES AEROSPATIALES': 'Autres',
    'CEREMA - CENTRE D ETUDES ET D EXPERTISE SUR LES RISQUES L ENVIRONNEMENT LA MOBILITE ET L AMENAGEMENT': 'Autres',
    'IFREMER - INSTITUT FRANÇAIS DE RECHERCHE POUR L EXPLOITATION DE LA MER': 'Autres',
    'INRIA – INSTITUT NATIONAL DE RECHERCHE EN INFORMATIQUE ET AUTOMATIQUE': 'Autres',
    'CSTB – CENTRE SCIENTIFIQUE ET TECHNIQUE DU BATIMENT': 'Autres',
    'INSEE – INSTITUT NATIONAL DE LA STATISTIQUE ET DES ETUDES ECONOMIQUES': 'Autres',
    'IRSTEA - INSTITUT NATIONAL DE RECHERCHE EN SCIENCES ET TECHNOLOGIES POUR L ENVIRONNEMENT ET L AGRICULTURE': 'Autres',
    'MUSEUM NATIONAL D HISTOIRE NATURELLE': 'Autres',
    'ETABLISSEMENT D ETUDE OU DE RECHERCHE AUTRE': 'Autres',
    'ENSEIGNEMENT PRIMAIRE ET SECONDAIRE': 'Autres',
    'ENSEIGNEMENT AGRICOLE': 'Autres',

    # =========================================================================
    # S – ETABLISSEMENT DE SANTE ET STRUCTURE SOCIALE
    # =========================================================================
    'ETABLISSEMENT HOSPITALIER': 'Autres',
    'MAISON DE RETRAITE': 'Autres',
    'ETABLISSEMENT PUBLIC DU MINISTERE DE LA SANTE': 'Autres',
    'ASSURANCE MALADIE': 'Autres',
    'ETABLISSEMENT DE SANTE AUTRE': 'Autres',
    'ETABLISSEMENT PUBLIC SOCIAL': 'Autres',
    'CENTRE COMMUNAL D ACTION SOCIALE': 'Autres',
    'ALLOCATIONS FAMILIALES': 'Autres',
    'CROUS': 'Autres',
    'STRUCTURE SOCIALE AUTRE': 'Autres',
    'POLE EMPLOI': 'Autres',

    # =========================================================================
    # Z – ETABLISSEMENT INDUSTRIEL ET COMMERCIAL
    # =========================================================================
    'ETABLISSEMENT INDUSTRIEL': 'Autres',
    'GRANDE DISTRIBUTION': 'Autres',
    'COMMERCE DE GROS': 'Autres',
    'COMMERCE DE DETAIL': 'Autres',
    'CHARBONNAGES DE FRANCE': 'Autres',
    'CARRIERE': 'Autres',
    'ACTIVITE EXTRACTIVE AUTRE': 'Autres',
    'CCI – CHAMBRE DE COMMERCE ET D INDUSTRIE': 'Autres',
    'CHAMBRE DES METIERS ET DE L ARTISANAT': 'Autres',

    # =========================================================================
    # L – ETABLISSEMENT DE TOURISME ET STRUCTURE DE LOISIR SPORTIVE OU CULTUELLE
    # =========================================================================
    'CAMPING': 'Autres',
    'HOTEL': 'Autres',
    'SYNDICAT D INITIATIVE': 'Autres',
    'ACTIVITE DE TOURISME AUTRE': 'Autres',
    'STRUCTURE LIEE AUX CULTES': 'Autres',
    'ETABLISSEMENT PUBLIC CULTUREL': 'Autres',
    'STRUCTURE CULTURELLE AUTRE': 'Autres',
    'ASSOCIATION SPORTIVE': 'Autres',

    # =========================================================================
    # Cas spécial
    # =========================================================================
    'PAS DE PROPRIETAIRE': 'Absence de propriétaires',
}


class OwnerImporter:
    """Import owners from df_owners_nat_2024 to owners table."""

    def __init__(self, db_url: str, dry_run: bool = False,
                 batch_size: int = 5000, num_workers: int = 4,
                 source_table: str = 'df_owners_nat_2024'):
        """
        Initialize the importer.

        Args:
            db_url: PostgreSQL connection string
            dry_run: If True, do not modify the database
            batch_size: Number of records per batch for insert operations
            num_workers: Number of parallel workers for database operations
            source_table: Name of the source table (default: df_owners_nat_2024)
        """
        self.db_url = db_url
        self.dry_run = dry_run
        self.batch_size = batch_size
        self.num_workers = num_workers
        self.source_table = source_table
        self.conn = None
        self.cursor = None

        # Thread-safe statistics
        self.stats = {
            'total_source': 0,
            'already_exists': 0,
            'to_import': 0,
            'imported': 0,
            'skipped_no_name': 0,
            'skipped_no_address': 0,
            'failed': 0,
        }
        self.stats_lock = threading.Lock()

    def connect(self):
        """Establish database connection."""
        try:
            self.conn = psycopg2.connect(self.db_url)
            self.cursor = self.conn.cursor(cursor_factory=RealDictCursor)
            print("Database connected successfully")
        except Exception as e:
            print(f"Database connection failed: {e}")
            raise

    def disconnect(self):
        """Close database connection."""
        if self.cursor:
            self.cursor.close()
        if self.conn:
            self.conn.close()

    def get_source_count(self) -> int:
        """Get total count of owners in source table with valid idpersonne."""
        self.cursor.execute(f"""
            SELECT COUNT(DISTINCT idpersonne)
            FROM {self.source_table}
            WHERE idpersonne IS NOT NULL
        """)
        result = self.cursor.fetchone()
        return result['count'] if result else 0

    def get_existing_idpersonnes(self) -> set:
        """Get set of idpersonne values already in owners table."""
        self.cursor.execute("""
            SELECT idpersonne
            FROM owners
            WHERE idpersonne IS NOT NULL
        """)
        return {row['idpersonne'] for row in self.cursor.fetchall()}

    def get_owners_to_import(self, limit: Optional[int] = None) -> List[Dict]:
        """
        Get owners from source table that don't exist in owners table.

        Args:
            limit: Maximum number of records to retrieve

        Returns:
            List of owner records to import
        """
        query = f"""
            SELECT DISTINCT ON (d.idpersonne)
                d.idpersonne,
                d.ddenom,
                d.jdatnss,
                d.dlign3,
                d.dlign4,
                d.dlign5,
                d.dlign6,
                d.catpro2txt,
                d.dsiren
            FROM {self.source_table} d
            WHERE d.idpersonne IS NOT NULL
              AND NOT EXISTS (
                  SELECT 1 FROM owners o WHERE o.idpersonne = d.idpersonne
              )
            ORDER BY d.idpersonne, d.idpk
        """

        if limit:
            query += f" LIMIT {limit}"

        self.cursor.execute(query)
        return self.cursor.fetchall()

    def parse_birthdate(self, jdatnss: Optional[str]) -> Optional[str]:
        """
        Parse birthdate from DD/MM/YYYY format to ISO format.

        Args:
            jdatnss: Date string in DD/MM/YYYY format

        Returns:
            ISO formatted date string or None
        """
        if not jdatnss or not jdatnss.strip():
            return None

        try:
            # Parse DD/MM/YYYY format
            parts = jdatnss.strip().split('/')
            if len(parts) != 3:
                return None

            day, month, year = parts
            date = datetime(int(year), int(month), int(day))
            return date.isoformat()
        except (ValueError, TypeError):
            return None

    def build_address_array(self, owner: Dict) -> List[str]:
        """
        Build address array from dlign3, dlign4, dlign5, dlign6 fields.

        Args:
            owner: Owner record from source table

        Returns:
            List of non-null address lines
        """
        address_lines = []
        for field in ['dlign3', 'dlign4', 'dlign5', 'dlign6']:
            value = owner.get(field)
            if value and value.strip():
                address_lines.append(value.strip())
        return address_lines

    def transform_owner(self, source: Dict) -> Optional[Dict]:
        """
        Transform a source owner record to ZLV owner format.

        Args:
            source: Owner record from df_owners_nat_2024

        Returns:
            Transformed owner record or None if invalid
        """
        # Validate required fields
        ddenom = source.get('ddenom')
        if not ddenom or not ddenom.strip():
            with self.stats_lock:
                self.stats['skipped_no_name'] += 1
            return None

        # Build address array
        address = self.build_address_array(source)
        if not address:
            with self.stats_lock:
                self.stats['skipped_no_address'] += 1
            return None

        # Process full name - replace / with space for physical persons
        catpro2txt = source.get('catpro2txt', '')
        full_name = ddenom.strip()
        if catpro2txt == 'PERSONNE PHYSIQUE':
            full_name = full_name.replace('/', ' ')

        # Map kind
        kind_class = KIND_MAPPING.get(catpro2txt, 'Autre')

        return {
            'idpersonne': source['idpersonne'],
            'full_name': full_name,
            'birth_date': self.parse_birthdate(source.get('jdatnss')),
            'address_dgfip': address,
            'kind_class': kind_class,
            'siren': source.get('dsiren'),
            'data_source': 'datafoncier-2024',
            'entity': 'personnes-physiques',
        }

    def _insert_batch_worker(self, batch_data: Tuple) -> Tuple[int, int, Optional[str]]:
        """
        Worker function to insert a batch of owners.

        Args:
            batch_data: Tuple of (batch_id, batch, db_url)

        Returns:
            Tuple of (batch_id, count_inserted, error_message)
        """
        batch_id, batch, db_url = batch_data

        conn = None
        try:
            # Each worker creates its own connection
            conn = psycopg2.connect(db_url)
            cursor = conn.cursor(cursor_factory=RealDictCursor)

            # Faster asynchronous commits
            cursor.execute("SET synchronous_commit = off")

            # Prepare insert data
            insert_data = [
                (
                    owner['idpersonne'],
                    owner['full_name'],
                    owner['birth_date'],
                    owner['address_dgfip'],
                    owner['kind_class'],
                    owner['siren'],
                    owner['data_source'],
                    owner['entity'],
                )
                for owner in batch
            ]

            # Execute batch insert
            execute_values(
                cursor,
                """
                INSERT INTO owners (
                    idpersonne,
                    full_name,
                    birth_date,
                    address_dgfip,
                    kind_class,
                    siren,
                    data_source,
                    entity,
                    created_at,
                    updated_at
                )
                VALUES %s
                ON CONFLICT (idpersonne) DO NOTHING
                """,
                insert_data,
                template="(%s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())",
                page_size=1000
            )

            # Independent commit per batch
            conn.commit()
            cursor.close()
            conn.close()

            return (batch_id, len(batch), None)

        except Exception as e:
            if conn:
                try:
                    conn.rollback()
                    conn.close()
                except:
                    pass
            return (batch_id, 0, str(e))

    def insert_owners(self, owners: List[Dict]):
        """
        Insert owners into the database using parallel workers.

        Args:
            owners: List of transformed owner records
        """
        if not owners:
            print("No owners to insert")
            return

        if self.dry_run:
            print(f"Dry run: {len(owners)} owners would be inserted")
            return

        print(f"\nInserting {len(owners):,} owners...")

        # Split into batches
        batches = []
        for i in range(0, len(owners), self.batch_size):
            batch = owners[i:i + self.batch_size]
            batches.append((i // self.batch_size, batch, self.db_url))

        # Process in parallel
        total_inserted = 0
        total_failed = 0

        with tqdm(total=len(owners), desc="Inserting", unit="owner") as pbar:
            with ThreadPoolExecutor(max_workers=self.num_workers) as executor:
                futures = {
                    executor.submit(self._insert_batch_worker, batch_data): batch_data
                    for batch_data in batches
                }

                for future in as_completed(futures):
                    batch_id, count, error = future.result()
                    if error:
                        logging.error(f"Batch {batch_id} error: {error}")
                        total_failed += len(batches[batch_id][1])
                    else:
                        total_inserted += count
                    pbar.update(count if count > 0 else len(batches[batch_id][1]))

        self.stats['imported'] = total_inserted
        self.stats['failed'] = total_failed

    def run(self, limit: Optional[int] = None):
        """
        Main execution method.

        Args:
            limit: Maximum number of owners to import
        """
        print("=" * 80)
        print("DATAFONCIER OWNER IMPORTER")
        print("=" * 80)
        print(f"Source table: {self.source_table}")
        print(f"Mode: {'DRY RUN' if self.dry_run else 'LIVE'}")
        print(f"Batch size: {self.batch_size:,}")
        print(f"Workers: {self.num_workers}")
        if limit:
            print(f"Limit: {limit:,}")
        print()

        self.connect()

        try:
            # Get statistics
            print("Analyzing source data...")
            self.stats['total_source'] = self.get_source_count()
            print(f"  Total distinct owners in {self.source_table}: {self.stats['total_source']:,}")

            existing = self.get_existing_idpersonnes()
            self.stats['already_exists'] = len(existing)
            print(f"  Already in owners table: {self.stats['already_exists']:,}")

            # Get owners to import
            print("\nFetching owners to import...")
            source_owners = self.get_owners_to_import(limit)
            print(f"  Found {len(source_owners):,} owners to import")

            if not source_owners:
                print("\nNo new owners to import")
                return

            # Transform owners
            print("\nTransforming owner records...")
            transformed_owners = []
            for owner in tqdm(source_owners, desc="Transforming", unit="owner"):
                transformed = self.transform_owner(owner)
                if transformed:
                    transformed_owners.append(transformed)

            self.stats['to_import'] = len(transformed_owners)
            print(f"\n  Valid owners to import: {self.stats['to_import']:,}")
            print(f"  Skipped (no name): {self.stats['skipped_no_name']:,}")
            print(f"  Skipped (no address): {self.stats['skipped_no_address']:,}")

            # Insert owners
            self.insert_owners(transformed_owners)

            # Final summary
            print("\n" + "=" * 80)
            print("SUMMARY")
            print("=" * 80)
            print(f"Source owners (with idpersonne): {self.stats['total_source']:,}")
            print(f"Already in owners table: {self.stats['already_exists']:,}")
            print(f"Attempted to import: {self.stats['to_import']:,}")
            print(f"Successfully imported: {self.stats['imported']:,}")
            print(f"Skipped (no name): {self.stats['skipped_no_name']:,}")
            print(f"Skipped (no address): {self.stats['skipped_no_address']:,}")
            print(f"Failed: {self.stats['failed']:,}")
            print("=" * 80)

        finally:
            self.disconnect()


def main():
    parser = argparse.ArgumentParser(
        description='Import owners from df_owners_nat_2024 to owners table'
    )

    # Database connection
    parser.add_argument(
        '--db-url',
        required=True,
        help='PostgreSQL connection URI (postgresql://user:pass@host:port/dbname)'
    )

    # Operation mode
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Simulation mode - do not modify database'
    )

    # Source table
    parser.add_argument(
        '--source-table',
        type=str,
        default='df_owners_nat_2024',
        help='Name of the source table (default: df_owners_nat_2024)'
    )

    # Limits and optimization
    parser.add_argument(
        '--limit',
        type=int,
        help='Maximum number of owners to import'
    )
    parser.add_argument(
        '--batch-size',
        type=int,
        default=5000,
        help='Batch size for insert operations (default: 5000)'
    )
    parser.add_argument(
        '--num-workers',
        type=int,
        default=4,
        help='Number of parallel workers (default: 4)'
    )

    # Debug
    parser.add_argument(
        '--debug',
        action='store_true',
        help='Enable debug logging'
    )

    args = parser.parse_args()

    # Setup logging
    logging.basicConfig(
        level=logging.DEBUG if args.debug else logging.WARNING,
        format='%(levelname)s - %(message)s'
    )

    # Run importer
    importer = OwnerImporter(
        db_url=args.db_url,
        dry_run=args.dry_run,
        batch_size=args.batch_size,
        num_workers=args.num_workers,
        source_table=args.source_table
    )

    try:
        importer.run(args.limit)
        print("\nCompleted successfully")
    except KeyboardInterrupt:
        print("\nInterrupted by user")
    except Exception as e:
        print(f"\nFailed: {e}")
        if args.debug:
            import traceback
            traceback.print_exc()


if __name__ == "__main__":
    main()
