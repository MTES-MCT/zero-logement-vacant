#!/usr/bin/env -S uv run
# /// script
# requires-python = ">=3.11"
# dependencies = [
#   "psycopg2-binary>=2.9.0",
#   "tqdm>=4.64.0",
#   "pyarrow>=14.0.0",
# ]
# ///
"""
Export owners from df_owners_nat_2024 to a Parquet file for review.

This script extracts owners from the Datafoncier source table (df_owners_nat_2024)
that are not yet present in the ZLV owners table, transforms them, and writes
to a Parquet file for inspection before database import.

Field Mapping:
- full_name       -> ddenom (with '/' replaced by space for physical persons)
- birth_date      -> jdatnss (converted from DD/MM/YYYY to ISO format)
- address_dgfip   -> [dlign3, dlign4, dlign5, dlign6] (non-null values as array, dlign4 formatted)
- kind_class      -> mapped from catpro3txt
- idpersonne      -> idpersonne
- siren           -> dsiren
- data_source     -> 'ff-2024'
- entity          -> mapped from ccogrm first character (null -> 'personnes-physiques')

Usage:
    python import_owners.py --db-url "postgresql://user:pass@host:port/dbname" --output owners.parquet
    python import_owners.py --db-url "$DATABASE_URL" --output owners.parquet --limit 1000
    python import_owners.py --db-url "$DATABASE_URL" --output owners.parquet --source-table df_owners_nat
    python import_owners.py --db-url "$DATABASE_URL" --output owners.parquet --department 75
    python import_owners.py --db-url "$DATABASE_URL" --output owners.parquet --sequential
    python import_owners.py --db-url "$DATABASE_URL" --output owners.parquet --sequential --start-department 50
"""

import argparse
import logging
from datetime import datetime
from typing import List, Dict, Optional

import psycopg2
from psycopg2.extras import RealDictCursor
from tqdm import tqdm
import pyarrow as pa
import pyarrow.parquet as pq


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

}


# Entity mapping from ccogrm first character
# Based on server/src/scripts/import-lovac/source-owners/source-owner.ts mapEntity()
ENTITY_MAPPING = {
    '0': 'personnes-morales-non-remarquables',
    '1': 'etat',
    '2': 'region',
    '3': 'departement',
    '4': 'commune',
    '5': 'office-hlm',
    '6': 'personnes-morales-representant-des-societes',
    '7': 'coproprietaire',
    '8': 'associe',
    '9': 'etablissements-publics-ou-organismes-assimiles',
}

PARQUET_SCHEMA = pa.schema([
    pa.field('idpersonne', pa.string()),
    pa.field('full_name', pa.string()),
    pa.field('birth_date', pa.string()),
    pa.field('address_dgfip', pa.list_(pa.string())),
    pa.field('kind_class', pa.string()),
    pa.field('siren', pa.string()),
    pa.field('data_source', pa.string()),
    pa.field('entity', pa.string()),
])


def map_entity(ccogrm: Optional[str]) -> str:
    """
    Map entity from ccogrm first character.
    Returns 'personnes-physiques' when ccogrm is null or empty.
    """
    if not ccogrm or not ccogrm.strip():
        return 'personnes-physiques'

    first_char = ccogrm.strip()[0]
    return ENTITY_MAPPING.get(first_char, 'personnes-physiques')


def format_dlign4(dlign4: Optional[str]) -> Optional[str]:
    """
    Format dlign4 address line from Datafoncier fixed format:
    - Positions 1-4: house number with zero padding
    - Position 5: repetition index (B=bis, T=ter, Q=quater, C=cinquième, etc.)
    - Positions 6+: street name

    Processing:
    - Remove leading zeros from house number
    - If position 5 is a letter (repetition index), add space after it
    - Clean up extra spaces

    Examples:
        "0028 RUE PARMENTIER" -> "28 RUE PARMENTIER"
        "0000 RTE DE LA DOUANE" -> "RTE DE LA DOUANE"
        "0060 BD GALLIENI" -> "60 BD GALLIENI"
        "0088CAV DE PARIS" -> "88C AV DE PARIS"
    """
    if not dlign4 or not dlign4.strip():
        return None

    line = dlign4.strip()

    if len(line) < 4:
        return line

    house_number = line[:4].lstrip('0')

    if not house_number:
        rest = line[4:].strip()
        return ' '.join(rest.split()) if rest else None

    if len(line) > 4:
        char5 = line[4]
        rest = line[5:] if len(line) > 5 else ''

        if char5.isalpha():
            street = rest.strip()
            result = f"{house_number}{char5} {street}" if street else f"{house_number}{char5}"
        else:
            street = (char5 + rest).strip()
            result = f"{house_number} {street}" if street else house_number
    else:
        result = house_number

    return ' '.join(result.split())


class OwnerExporter:
    """Extract and transform owners from df_owners_nat_2024, write to Parquet."""

    def __init__(self, db_url: str, output: str,
                 source_table: str = 'df_owners_nat_2024',
                 department: Optional[str] = None):
        self.db_url = db_url
        self.output = output
        self.source_table = source_table
        self.department = department
        self.conn = None
        self.cursor = None

        self.stats = {
            'total_source': 0,
            'to_export': 0,
            'exported': 0,
            'skipped_no_name': 0,
            'skipped_no_address': 0,
        }

    def connect(self):
        self.conn = psycopg2.connect(self.db_url)
        self.cursor = self.conn.cursor(cursor_factory=RealDictCursor)
        print("Database connected successfully")

    def disconnect(self):
        if self.cursor:
            self.cursor.close()
        if self.conn:
            self.conn.close()

    def get_departments(self) -> List[str]:
        self.cursor.execute(f"""
            SELECT DISTINCT ccodep
            FROM {self.source_table}
            WHERE ccodep IS NOT NULL
            ORDER BY ccodep
        """)
        return [row['ccodep'] for row in self.cursor.fetchall()]

    def get_source_count(self, department: Optional[str] = None) -> int:
        dept_filter = f"AND ccodep = '{department}'" if department else ""
        self.cursor.execute(f"""
            SELECT COUNT(DISTINCT idpersonne)
            FROM {self.source_table}
            WHERE idpersonne IS NOT NULL
            {dept_filter}
        """)
        result = self.cursor.fetchone()
        return result['count'] if result else 0

    def get_owners_to_export(self, limit: Optional[int] = None,
                             department: Optional[str] = None) -> List[Dict]:
        dept_filter = f"AND d.ccodep = '{department}'" if department else ""

        query = f"""
            SELECT DISTINCT ON (d.idpersonne)
                d.idpersonne,
                d.ddenom,
                d.jdatnss,
                d.dlign3,
                d.dlign4,
                d.dlign5,
                d.dlign6,
                d.catpro3txt,
                d.dsiren,
                d.ccogrm
            FROM {self.source_table} d
            WHERE d.idpersonne IS NOT NULL
              {dept_filter}
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
        if not jdatnss or not jdatnss.strip():
            return None

        try:
            parts = jdatnss.strip().split('/')
            if len(parts) != 3:
                return None
            day, month, year = parts
            date = datetime(int(year), int(month), int(day))
            return date.isoformat()
        except (ValueError, TypeError):
            return None

    def build_address_array(self, owner: Dict) -> List[str]:
        address_lines = []

        dlign3 = owner.get('dlign3')
        if dlign3 and dlign3.strip():
            address_lines.append(dlign3.strip())

        dlign4 = format_dlign4(owner.get('dlign4'))
        if dlign4:
            address_lines.append(dlign4)

        for field in ['dlign5', 'dlign6']:
            value = owner.get(field)
            if value and value.strip():
                address_lines.append(value.strip())

        return address_lines

    def transform_owner(self, source: Dict) -> Optional[Dict]:
        ddenom = source.get('ddenom')
        if not ddenom or not ddenom.strip():
            self.stats['skipped_no_name'] += 1
            return None

        address = self.build_address_array(source)
        if not address:
            self.stats['skipped_no_address'] += 1
            return None

        catpro3txt = source.get('catpro3txt', '')
        full_name = ddenom.strip()
        if catpro3txt == 'PERSONNE PHYSIQUE':
            full_name = full_name.replace('/', ' ')

        kind_class = KIND_MAPPING.get(catpro3txt, 'Autres')
        entity = map_entity(source.get('ccogrm'))

        return {
            'idpersonne': source['idpersonne'],
            'full_name': full_name,
            'birth_date': self.parse_birthdate(source.get('jdatnss')),
            'address_dgfip': address,
            'kind_class': kind_class,
            'siren': source.get('dsiren'),
            'data_source': 'ff-2024',
            'entity': entity,
        }

    def write_parquet(self, owners: List[Dict], append: bool = False):
        """Write transformed owners to the Parquet output file."""
        if not owners:
            return

        table = pa.table(
            {
                'idpersonne': pa.array([o['idpersonne'] for o in owners], type=pa.string()),
                'full_name': pa.array([o['full_name'] for o in owners], type=pa.string()),
                'birth_date': pa.array([o['birth_date'] for o in owners], type=pa.string()),
                'address_dgfip': pa.array([o['address_dgfip'] for o in owners], type=pa.list_(pa.string())),
                'kind_class': pa.array([o['kind_class'] for o in owners], type=pa.string()),
                'siren': pa.array([o['siren'] for o in owners], type=pa.string()),
                'data_source': pa.array([o['data_source'] for o in owners], type=pa.string()),
                'entity': pa.array([o['entity'] for o in owners], type=pa.string()),
            },
            schema=PARQUET_SCHEMA,
        )

        if append:
            existing = pq.read_table(self.output)
            table = pa.concat_tables([existing, table])

        pq.write_table(table, self.output)
        self.stats['exported'] += len(owners)

    def process_department(self, department: str, limit: Optional[int] = None,
                           append: bool = False) -> bool:
        print(f"\n--- Department {department} ---")

        count = self.get_source_count(department)
        print(f"  Owners in source: {count:,}")

        if count == 0:
            print(f"  No owners in department {department}, skipping")
            return True

        source_owners = self.get_owners_to_export(limit, department)
        print(f"  To export: {len(source_owners):,}")

        if not source_owners:
            print(f"  No new owners to export for department {department}")
            return True

        transformed = []
        for owner in tqdm(source_owners, desc=f"Dept {department}", unit="owner", leave=False):
            result = self.transform_owner(owner)
            if result:
                transformed.append(result)

        self.write_parquet(transformed, append=append)
        print(f"  Exported: {len(transformed):,}")
        return True

    def run(self, limit: Optional[int] = None, sequential: bool = False,
            start_department: Optional[str] = None):
        print("=" * 80)
        print("DATAFONCIER OWNER EXPORTER")
        print("=" * 80)
        print(f"Source table : {self.source_table}")
        print(f"Output file  : {self.output}")
        if self.department:
            print(f"Department   : {self.department}")
        if sequential:
            print("Sequential mode: processing all departments one by one")
        if start_department:
            print(f"Starting from department: {start_department}")
        if limit:
            print(f"Limit        : {limit:,}")
        print()

        self.connect()

        try:
            if self.department:
                departments = [self.department]
            elif sequential:
                departments = self.get_departments()
                print(f"Found {len(departments)} departments to process")

                if start_department:
                    try:
                        start_idx = departments.index(start_department)
                        skipped = departments[:start_idx]
                        departments = departments[start_idx:]
                        print(f"Skipping {len(skipped)} departments before {start_department}")
                    except ValueError:
                        print(f"Warning: start_department {start_department} not found, processing all")
            else:
                departments = [None]

            total_exported = 0
            first_write = True

            for dept in departments:
                if dept is None:
                    print("Fetching owners to export...")
                    source_owners = self.get_owners_to_export(limit)
                    print(f"  Found {len(source_owners):,} owners to export")

                    if not source_owners:
                        print("\nNo new owners to export")
                        return

                    transformed = []
                    for owner in tqdm(source_owners, desc="Transforming", unit="owner"):
                        result = self.transform_owner(owner)
                        if result:
                            transformed.append(result)

                    print(f"\n  Valid owners: {len(transformed):,}")
                    self.write_parquet(transformed)
                    total_exported = self.stats['exported']
                else:
                    self.process_department(dept, limit, append=not first_write)
                    total_exported = self.stats['exported']
                    first_write = False

            print("\n" + "=" * 80)
            print("SUMMARY")
            print("=" * 80)
            print(f"Total exported    : {total_exported:,}")
            print(f"Skipped (no name) : {self.stats['skipped_no_name']:,}")
            print(f"Skipped (no addr) : {self.stats['skipped_no_address']:,}")
            print(f"Output file       : {self.output}")
            print("=" * 80)

        finally:
            self.disconnect()


def main():
    parser = argparse.ArgumentParser(
        description='Export owners from df_owners_nat_2024 to a Parquet file'
    )

    parser.add_argument(
        '--db-url',
        required=True,
        help='PostgreSQL connection URI (postgresql://user:pass@host:port/dbname)'
    )
    parser.add_argument(
        '--output',
        required=True,
        help='Output Parquet file path (e.g. owners.parquet)'
    )
    parser.add_argument(
        '--source-table',
        type=str,
        default='df_owners_nat_2024',
        help='Name of the source table (default: df_owners_nat_2024)'
    )
    parser.add_argument(
        '--limit',
        type=int,
        help='Maximum number of owners to export'
    )
    parser.add_argument(
        '--department', '--dept',
        type=str,
        dest='department',
        help='Process specific department only (e.g., 75, 01, 2A)'
    )
    parser.add_argument(
        '--sequential',
        action='store_true',
        help='Process all departments one by one (avoids OOM)'
    )
    parser.add_argument(
        '--start-department', '--start-dept',
        type=str,
        dest='start_department',
        help='Starting department when using --sequential (resume from)'
    )
    parser.add_argument(
        '--debug',
        action='store_true',
        help='Enable debug logging'
    )

    args = parser.parse_args()

    logging.basicConfig(
        level=logging.DEBUG if args.debug else logging.WARNING,
        format='%(levelname)s - %(message)s'
    )

    exporter = OwnerExporter(
        db_url=args.db_url,
        output=args.output,
        source_table=args.source_table,
        department=args.department,
    )

    try:
        exporter.run(
            limit=args.limit,
            sequential=args.sequential,
            start_department=args.start_department,
        )
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
