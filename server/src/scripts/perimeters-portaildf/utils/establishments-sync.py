#!/usr/bin/env python3
"""
Script to synchronize ZLV establishments with Cerema structure data.
Implements the workflow for checking SIREN correspondence and updating establishment perimeters.
"""

import psycopg2
import psycopg2.extras
import requests
import json
import logging
import argparse
import os
import csv
from typing import List, Dict, Optional, Tuple, Set
from dataclasses import dataclass
from datetime import datetime
import time

# Database Configuration
DB_CONFIG = {
    'host': 'localhost',
    'port': 5432,
    'database': 'copieprod',
    'user': 'postgres',
    'password': 'postgres'
}

# Configuration files
LOCALITIES_CSV_FILE = "localities.csv"  # Path to localities CSV file

# Bearer Token for API authentication
BEARER_TOKEN = os.getenv('CEREMA_API_TOKEN')  # Get token from environment variable

# Portail DF API Configuration
PORTAIL_DF_API_CONFIG = {
    'base_url': 'https://portaildf.cerema.fr/api',
    'headers': {
        'User-Agent': 'ZLV-Sync/1.0',
        'Accept': 'application/json'
    }
}

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('zlv_establishment_sync.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

@dataclass
class ZLVUser:
    """Represents a ZLV user."""
    id: str
    email: str
    first_name: Optional[str]
    last_name: Optional[str]
    establishment_id: Optional[str]
    establishment_name: Optional[str]
    establishment_siren: Optional[str]

@dataclass
class ZLVEstablishment:
    """Represents a ZLV establishment."""
    id: str
    name: Optional[str]
    siren: Optional[str]
    localities_geo_code: Optional[List[str]]

@dataclass
class CeremaStructure:
    """Represents a Cerema structure."""
    id: str
    raison_sociale: str
    siret: str
    perimeters: List[str]
    fr_entiere: bool = False

@dataclass
class LocalityData:
    """Represents a locality from CSV."""
    com_code: str
    com_siren: str
    com_name: str
    dep_code: str
    reg_code: str

class ZLVEstablishmentSynchronizer:
    """Main class for synchronizing ZLV establishments with Cerema data."""
    
    def __init__(self, dry_run: bool = True):
        self.dry_run = dry_run
        self.session = requests.Session()
        self.session.headers.update(PORTAIL_DF_API_CONFIG['headers'])
        
        # Add Bearer token if available
        if BEARER_TOKEN:
            self.session.headers['Authorization'] = f'Bearer {BEARER_TOKEN}'
            logger.info("🔑 Bearer token configured for API authentication")
        else:
            logger.warning("⚠️ No bearer token found in CEREMA_API_TOKEN environment variable")
        
        # Load localities data
        self.localities_data = self.load_localities_data()
        
        self.processed_establishments = set()
        self.sync_stats = {
            'total_users': 0,
            'total_establishments': 0,
            'api_matches': 0,
            'api_mismatches': 0,
            'perimeter_updates': 0,
            'name_updates': 0,
            'no_changes': 0,
            'errors': 0,
            'fr_entiere_skipped': 0
        }
        
        if dry_run:
            logger.info("🔍 DRY RUN MODE - No changes will be made to the database")
            
    def get_user_structure_from_portail_df(self, email: str) -> Optional[str]:
        """
        Get user structure ID from Portail DF API using email.
        
        Args:
            email: User email to search for
            
        Returns:
            Optional[str]: Structure ID if found
        """
        try:
            url = f"{PORTAIL_DF_API_CONFIG['base_url']}/utilisateurs"
            params = {'email': email}
            
            response = self.session.get(url, params=params)
            response.raise_for_status()
            
            data = response.json()
            results = data.get('results', [])
            
            if results:
                first_user = results[0]
                structure_id = first_user.get('structure')
                if structure_id:
                    logger.debug(f"📧 Found structure {structure_id} for user {email}")
                    return str(structure_id)
            
            logger.debug(f"❌ No structure found for user {email}")
            return None
            
        except requests.RequestException as e:
            logger.warning(f"⚠️ Error getting structure for {email}: {e}")
            return None
        
    def load_localities_data(self) -> Dict[str, List[LocalityData]]:
        """
        Load localities data from CSV file and organize by department and region codes.
        
        Returns:
            Dict with 'dep' and 'reg' keys containing locality mappings
        """
        logger.info("📂 Loading localities data from CSV...")
        
        localities_by_dep = {}
        localities_by_reg = {}
        
        if not os.path.exists(LOCALITIES_CSV_FILE):
            logger.error(f"❌ Localities CSV file not found: {LOCALITIES_CSV_FILE}")
            return {'dep': localities_by_dep, 'reg': localities_by_reg}
        
        try:
            with open(LOCALITIES_CSV_FILE, 'r', encoding='utf-8') as csvfile:
                reader = csv.DictReader(csvfile)
                
                for row in reader:
                    locality = LocalityData(
                        com_code=row['Com Code'].strip(),
                        com_siren=row['Com Siren'].strip(),
                        com_name=row['Com Name'].strip(),
                        dep_code=row['dep code'].strip(),
                        reg_code=row['reg code'].strip()
                    )
                    
                    # Group by department code
                    if locality.dep_code not in localities_by_dep:
                        localities_by_dep[locality.dep_code] = []
                    localities_by_dep[locality.dep_code].append(locality)
                    
                    # Group by region code
                    if locality.reg_code not in localities_by_reg:
                        localities_by_reg[locality.reg_code] = []
                    localities_by_reg[locality.reg_code].append(locality)
            
            total_localities = sum(len(localities) for localities in localities_by_dep.values())
            logger.info(f"📍 Loaded {total_localities} localities from CSV")
            logger.info(f"🏛️ Found {len(localities_by_dep)} departments and {len(localities_by_reg)} regions")
            
        except Exception as e:
            logger.error(f"❌ Error loading localities CSV: {e}")
        
        return {'dep': localities_by_dep, 'reg': localities_by_reg}
    
    def get_database_connection(self):
        """Get database connection."""
        try:
            conn = psycopg2.connect(**DB_CONFIG)
            return conn
        except psycopg2.Error as e:
            logger.error(f"❌ Database connection error: {e}")
            raise
    
    def get_all_zlv_users(self) -> List[ZLVUser]:
        """
        Retrieve all ZLV users from the database with establishment information.
        
        Returns:
            List[ZLVUser]: List of all ZLV users
        """
        logger.info("🔍 Retrieving all ZLV users from database...")
        users = []
        
        query = """
        SELECT 
            u.id,
            u.email,
            u.first_name,
            u.last_name,
            u.establishment_id,
            e.name as establishment_name,
            e.siren as establishment_siren
        FROM users u
        LEFT JOIN establishments e ON u.establishment_id = e.id
        WHERE u.email IS NOT NULL
        AND u.email != ''
        AND u.deleted_at IS NULL
        ORDER BY u.email;
        """
        
        try:
            with self.get_database_connection() as conn:
                with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cursor:
                    cursor.execute(query)
                    rows = cursor.fetchall()
                    
                    for row in rows:
                        users.append(ZLVUser(
                            id=str(row['id']),
                            email=row['email'],
                            first_name=row['first_name'],
                            last_name=row['last_name'],
                            establishment_id=str(row['establishment_id']) if row['establishment_id'] else None,
                            establishment_name=row['establishment_name'],
                            establishment_siren=row['establishment_siren']
                        ))
            
            self.sync_stats['total_users'] = len(users)
            logger.info(f"📧 Retrieved {len(users)} ZLV users")
            
        except psycopg2.Error as e:
            logger.error(f"❌ Error retrieving ZLV users: {e}")
            raise
        
        return users
    
    def get_unique_establishments(self, users: List[ZLVUser]) -> List[ZLVEstablishment]:
        """
        Extract unique establishments from user list and get current database state.
        
        Args:
            users: List of ZLV users
            
        Returns:
            List[ZLVEstablishment]: Unique establishments with current data
        """
        logger.info("🏢 Extracting unique establishments...")
        
        # Get unique establishment IDs
        establishment_ids = set()
        for user in users:
            if user.establishment_id:
                establishment_ids.add(user.establishment_id)
        
        establishments = []
        
        if not establishment_ids:
            logger.warning("⚠️ No establishments found")
            return establishments
        
        # Get establishment data from database
        query = """
        SELECT 
            id,
            name,
            siren,
            localities_geo_code
        FROM establishments
        WHERE id = ANY(%s::uuid[])
        ORDER BY name;
        """
        
        try:
            with self.get_database_connection() as conn:
                with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cursor:
                    cursor.execute(query, (list(establishment_ids),))
                    rows = cursor.fetchall()
                    
                    for row in rows:
                        establishments.append(ZLVEstablishment(
                            id=str(row['id']),
                            name=row['name'],
                            siren=row['siren'],
                            localities_geo_code=row['localities_geo_code'] or []
                        ))
            
            self.sync_stats['total_establishments'] = len(establishments)
            logger.info(f"🏛️ Found {len(establishments)} unique establishments")
            
        except psycopg2.Error as e:
            logger.error(f"❌ Error retrieving establishments: {e}")
            raise
        
        return establishments
    
    def get_user_permissions_from_portail_df(self, email: str) -> Optional[Dict]:
        """
        Get user permissions from Portail DF API using email.
        
        Args:
            email: User email to search for
            
        Returns:
            Optional[Dict]: Permissions data if found
        """
        try:
            url = f"{PORTAIL_DF_API_CONFIG['base_url']}/permissions"
            params = {'email': email}
            
            response = self.session.get(url, params=params)
            response.raise_for_status()
            
            data = response.json()
            lovac_permissions = data.get('lovac', {})
            
            if lovac_permissions:
                logger.debug(f"📧 Found permissions for user {email}")
                return lovac_permissions
            
            logger.debug(f"❌ No permissions found for user {email}")
            return None
            
        except requests.RequestException as e:
            logger.warning(f"⚠️ Error getting permissions for {email}: {e}")
            return None
    
    def build_perimeters_from_lovac_data(self, lovac_data: Dict) -> Tuple[List[str], bool]:
        """
        Build perimeters list from LOVAC permissions data.
        
        Args:
            lovac_data: LOVAC permissions data (merged from all users)
            
        Returns:
            Tuple[List[str], bool]: (commune_codes, fr_entiere_flag)
        """
        fr_entiere = lovac_data.get('fr_entiere', False)
        
        # If fr_entiere is True, return empty list and flag
        if fr_entiere:
            logger.debug("🇫🇷 France entière permissions - no specific perimeters")
            return [], True
        
        commune_codes = set()
        
        # Direct commune codes
        comm_codes = lovac_data.get('comm', [])
        if comm_codes:
            commune_codes.update(comm_codes)
            logger.debug(f"📍 Found {len(comm_codes)} direct commune codes")
        
        # Department codes - get all communes in these departments
        dep_codes = lovac_data.get('dep', [])
        for dep_code in dep_codes:
            if dep_code in self.localities_data['dep']:
                dep_communes = [loc.com_code for loc in self.localities_data['dep'][dep_code]]
                commune_codes.update(dep_communes)
                logger.debug(f"🏛️ Added {len(dep_communes)} communes from department {dep_code}")
            else:
                logger.warning(f"⚠️ Department code {dep_code} not found in localities data")
        
        # Region codes - get all communes in these regions
        reg_codes = lovac_data.get('reg', [])
        for reg_code in reg_codes:
            if reg_code in self.localities_data['reg']:
                reg_communes = [loc.com_code for loc in self.localities_data['reg'][reg_code]]
                commune_codes.update(reg_communes)
                logger.debug(f"🗺️ Added {len(reg_communes)} communes from region {reg_code}")
            else:
                logger.warning(f"⚠️ Region code {reg_code} not found in localities data")
        
        final_codes = sorted(list(commune_codes))
        logger.debug(f"📊 Total commune codes: {len(final_codes)}")
        
        return final_codes, False
    def get_cerema_structure(self, structure_id: str, user_email: str) -> Optional[CeremaStructure]:
        """
        Get structure details from Portail DF API.
        
        Args:
            structure_id: Structure ID from Portail DF
            user_email: User email to get permissions for
            
        Returns:
            Optional[CeremaStructure]: Structure details if found
        """
        try:
            url = f"{PORTAIL_DF_API_CONFIG['base_url']}/structures/{structure_id}"
            
            response = self.session.get(url)
            response.raise_for_status()
            
            data = response.json()
            
            # Get permissions for this user
            permissions = self.get_user_permissions_from_portail_df(user_email)
            if not permissions:
                logger.warning(f"⚠️ No permissions found for user {user_email}")
                return None
            
            # Build perimeters from permissions
            perimeters, fr_entiere = self.build_perimeters_from_lovac_data(permissions)
            
            return CeremaStructure(
                id=structure_id,
                raison_sociale=data.get('raison_sociale', ''),
                siret=data.get('siret', ''),
                perimeters=perimeters,
                fr_entiere=fr_entiere
            )
            
        except requests.RequestException as e:
            logger.warning(f"⚠️ Error getting structure {structure_id}: {e}")
            return None
    
    def get_merged_permissions_for_establishment(self, establishment: ZLVEstablishment, users: List[ZLVUser]) -> Optional[Dict]:
        """
        Get and merge permissions from all users of an establishment.
        
        Args:
            establishment: ZLV establishment
            users: List of all users
            
        Returns:
            Optional[Dict]: Merged permissions data
        """
        # Get users belonging to this establishment
        establishment_users = [
            user for user in users 
            if user.establishment_id == establishment.id
        ]
        
        if not establishment_users:
            logger.warning(f"⚠️ No users found for establishment {establishment.name}")
            return None
        
        logger.info(f"🔍 Getting permissions for {len(establishment_users)} users in {establishment.name}")
        
        # Initialize merged permissions
        merged_permissions = {
            'fr_entiere': False,
            'comm': set(),
            'dep': set(),
            'reg': set()
        }
        
        permissions_found = False
        
        # Get permissions for each user
        for user in establishment_users:
            logger.debug(f"📧 Getting permissions for user {user.email}")
            
            user_permissions = self.get_user_permissions_from_portail_df(user.email)
            
            if user_permissions:
                permissions_found = True
                
                # Check fr_entiere - if any user has fr_entiere=True, the whole establishment has it
                if user_permissions.get('fr_entiere', False):
                    merged_permissions['fr_entiere'] = True
                    logger.info(f"🇫🇷 User {user.email} has France entière permissions")
                
                # Merge commune codes
                user_comm = user_permissions.get('comm', [])
                if user_comm:
                    merged_permissions['comm'].update(user_comm)
                    logger.debug(f"📍 Added {len(user_comm)} commune codes from {user.email}")
                
                # Merge department codes
                user_dep = user_permissions.get('dep', [])
                if user_dep:
                    merged_permissions['dep'].update(user_dep)
                    logger.debug(f"🏛️ Added {len(user_dep)} department codes from {user.email}")
                
                # Merge region codes
                user_reg = user_permissions.get('reg', [])
                if user_reg:
                    merged_permissions['reg'].update(user_reg)
                    logger.debug(f"🗺️ Added {len(user_reg)} region codes from {user.email}")
            
            # Small delay between API calls
            time.sleep(0.2)
        
        if not permissions_found:
            logger.warning(f"⚠️ No permissions found for any user in {establishment.name}")
            return None
        
        # Convert sets back to lists for easier handling
        final_permissions = {
            'fr_entiere': merged_permissions['fr_entiere'],
            'comm': sorted(list(merged_permissions['comm'])),
            'dep': sorted(list(merged_permissions['dep'])),
            'reg': sorted(list(merged_permissions['reg']))
        }
        
        logger.info(f"📊 Merged permissions for {establishment.name}:")
        logger.info(f"  🇫🇷 France entière: {final_permissions['fr_entiere']}")
        logger.info(f"  📍 Communes: {len(final_permissions['comm'])}")
        logger.info(f"  🏛️ Departments: {len(final_permissions['dep'])}")
        logger.info(f"  🗺️ Regions: {len(final_permissions['reg'])}")
        
        return final_permissions
    def find_structure_for_establishment(self, establishment: ZLVEstablishment, users: List[ZLVUser]) -> Optional[CeremaStructure]:
        """
        Find Cerema structure for an establishment by checking users' emails and merging permissions.
        
        Args:
            establishment: ZLV establishment
            users: List of all users
            
        Returns:
            Optional[CeremaStructure]: Cerema structure if found
        """
        # Get users belonging to this establishment
        establishment_users = [
            user for user in users 
            if user.establishment_id == establishment.id
        ]
        
        logger.info(f"🔍 Checking {len(establishment_users)} users for establishment {establishment.name}")
        
        # Try to find structure using user emails (limit to first 5 for structure discovery)
        structure_id = None
        structure_data = None
        
        for user in establishment_users[:5]:
            found_structure_id = self.get_user_structure_from_portail_df(user.email)
            if found_structure_id:
                # Get structure details
                try:
                    url = f"{PORTAIL_DF_API_CONFIG['base_url']}/structures/{found_structure_id}"
                    response = self.session.get(url)
                    response.raise_for_status()
                    
                    structure_data = response.json()
                    structure_id = found_structure_id
                    logger.info(f"✅ Found structure {structure_id} for {establishment.name} via user {user.email}")
                    break
                    
                except requests.RequestException as e:
                    logger.warning(f"⚠️ Error getting structure {found_structure_id}: {e}")
                    continue
            
            # Small delay between API calls
            time.sleep(0.2)
        
        if not structure_id or not structure_data:
            logger.info(f"❌ No Cerema structure found for {establishment.name}")
            return None
        
        # Get merged permissions from all users in the establishment
        merged_permissions = self.get_merged_permissions_for_establishment(establishment, users)
        
        if not merged_permissions:
            logger.warning(f"⚠️ No permissions found for establishment {establishment.name}")
            return None
        
        # Build perimeters from merged permissions
        perimeters, fr_entiere = self.build_perimeters_from_lovac_data(merged_permissions)
        
        return CeremaStructure(
            id=structure_id,
            raison_sociale=structure_data.get('raison_sociale', ''),
            siret=structure_data.get('siret', ''),
            perimeters=perimeters,
            fr_entiere=fr_entiere
        )
    
    def siret_to_siren(self, siret: str) -> str:
        """
        Convert SIRET to SIREN (first 9 digits).
        
        Args:
            siret: SIRET number
            
        Returns:
            str: SIREN number
        """
        return siret[:9] if len(siret) >= 9 else siret
    
    def check_establishment_changes(self, establishment: ZLVEstablishment, cerema_structure: CeremaStructure) -> Dict[str, bool]:
        """
        Check what needs to be updated for an establishment.
        
        Args:
            establishment: Current ZLV establishment
            cerema_structure: Cerema structure data
            
        Returns:
            Dict[str, bool]: What needs updating
        """
        changes = {
            'name': False,
            'siren': False,
            'perimeters': False
        }
        
        # Check name (raison_sociale)
        current_name = establishment.name or ""
        new_name = cerema_structure.raison_sociale or ""
        if current_name.strip() != new_name.strip():
            changes['name'] = True
            logger.info(f"📝 Name change detected: '{current_name}' → '{new_name}'")
        
        # Check SIREN (from SIRET)
        cerema_siren = self.siret_to_siren(cerema_structure.siret)
        current_siren = str(establishment.siren) if establishment.siren else ""
        cerema_siren_str = str(cerema_siren) if cerema_siren else ""
        
        if current_siren != cerema_siren_str:
            changes['siren'] = True
            logger.info(f"🔢 SIREN change detected: '{current_siren}' → '{cerema_siren_str}'")
        
        # Check perimeters
        current_perimeters = set(establishment.localities_geo_code or [])
        new_perimeters = set(cerema_structure.perimeters)
        if current_perimeters != new_perimeters:
            changes['perimeters'] = True
            logger.info(f"📐 Perimeter changes detected: {len(current_perimeters)} → {len(new_perimeters)} communes")
        
        return changes
    
    def update_establishment(self, establishment: ZLVEstablishment, cerema_structure: CeremaStructure, changes: Dict[str, bool]):
        """
        Update establishment in database with Cerema data.
        
        Args:
            establishment: ZLV establishment to update
            cerema_structure: Cerema structure with new data
            changes: What needs to be updated
        """
        if not any(changes.values()):
            logger.info(f"✅ No changes needed for {establishment.name}")
            self.sync_stats['no_changes'] += 1
            return
        
        if self.dry_run:
            logger.info(f"🔍 DRY RUN: Would update establishment {establishment.name}")
            if changes['name']:
                logger.info(f"🔍 DRY RUN: Would update name to '{cerema_structure.raison_sociale}'")
                self.sync_stats['name_updates'] += 1
            if changes['siren']:
                logger.info(f"🔍 DRY RUN: Would update SIREN to '{self.siret_to_siren(cerema_structure.siret)}'")
            if changes['perimeters']:
                logger.info(f"🔍 DRY RUN: Would update perimeters ({len(cerema_structure.perimeters)} communes)")
                self.sync_stats['perimeter_updates'] += 1
            return
        
        try:
            # Build update query dynamically
            update_fields = []
            params = []
            
            if changes['name']:
                update_fields.append("name = %s")
                params.append(cerema_structure.raison_sociale)
                self.sync_stats['name_updates'] += 1
            
            if changes['siren']:
                update_fields.append("siren = %s")
                params.append(self.siret_to_siren(cerema_structure.siret))
            
            if changes['perimeters']:
                update_fields.append("localities_geo_code = %s")
                params.append(cerema_structure.perimeters)
                self.sync_stats['perimeter_updates'] += 1
            
            # Add updated_at timestamp
            update_fields.append("updated_at = NOW()")
            params.append(establishment.id)
            
            query = f"""
            UPDATE establishments 
            SET {', '.join(update_fields)}
            WHERE id = %s
            """
            
            with self.get_database_connection() as conn:
                with conn.cursor() as cursor:
                    cursor.execute(query, params)
                    conn.commit()
            
            logger.info(f"✅ Updated establishment {establishment.name}")
            
        except psycopg2.Error as e:
            logger.error(f"❌ Error updating establishment {establishment.name}: {e}")
            self.sync_stats['errors'] += 1
    
    def process_establishment(self, establishment: ZLVEstablishment, users: List[ZLVUser]):
        """
        Process a single establishment through the complete workflow.
        
        Args:
            establishment: ZLV establishment to process
            users: All ZLV users for reference
        """
        if establishment.id in self.processed_establishments:
            logger.info(f"⏭️ Skipping already processed establishment: {establishment.name}")
            return
        
        logger.info(f"🏢 Processing establishment: {establishment.name} (ID: {establishment.id})")
        
        # Find corresponding Cerema structure
        cerema_structure = self.find_structure_for_establishment(establishment, users)
        
        if cerema_structure:
            # Check if fr_entiere is True - skip update in this case
            if cerema_structure.fr_entiere:
                logger.info(f"🇫🇷 Skipping {establishment.name} - France entière permissions (no specific perimeters)")
                self.sync_stats['fr_entiere_skipped'] += 1
                self.processed_establishments.add(establishment.id)
                return
            
            logger.info(f"✅ Found Cerema structure for {establishment.name}")
            self.sync_stats['api_matches'] += 1
            
            # Check what needs to be updated
            changes = self.check_establishment_changes(establishment, cerema_structure)
            
            # Update establishment if needed
            self.update_establishment(establishment, cerema_structure, changes)
        else:
            logger.info(f"❌ No Cerema structure found for {establishment.name}")
            self.sync_stats['api_mismatches'] += 1
        
        self.processed_establishments.add(establishment.id)
        
        # Small delay between establishments
        time.sleep(0.5)
    
    def run_synchronization(self):
        """
        Run the complete synchronization workflow.
        """
        logger.info("🚀 Starting ZLV establishment synchronization workflow")
        start_time = datetime.now()
        
        try:
            # Step 1: Get all ZLV users
            users = self.get_all_zlv_users()
            
            if not users:
                logger.error("❌ No users found. Stopping synchronization.")
                return
            
            # Step 2: Extract unique establishments
            establishments = self.get_unique_establishments(users)
            
            if not establishments:
                logger.error("❌ No establishments found. Stopping synchronization.")
                return
            
            # Step 3: Process each establishment
            for establishment in establishments:
                self.process_establishment(establishment, users)
            
            # Step 4: Generate summary report
            self.generate_summary_report(start_time)
            
        except Exception as e:
            logger.error(f"❌ Critical error in synchronization workflow: {e}")
            raise
    
    def generate_summary_report(self, start_time: datetime):
        """
        Generate and log a summary report of the synchronization.
        
        Args:
            start_time: When the synchronization started
        """
        end_time = datetime.now()
        duration = end_time - start_time
        
        mode = "DRY RUN" if self.dry_run else "LIVE"
        
        logger.info(f"\n🎉 === SYNCHRONIZATION COMPLETED ({mode}) ===")
        logger.info(f"⏱️ Duration: {duration}")
        logger.info(f"👥 Total users processed: {self.sync_stats['total_users']}")
        logger.info(f"🏢 Total establishments processed: {self.sync_stats['total_establishments']}")
        logger.info(f"✅ API structure matches: {self.sync_stats['api_matches']}")
        logger.info(f"❌ API structure mismatches: {self.sync_stats['api_mismatches']}")
        logger.info(f"📝 Name updates: {self.sync_stats['name_updates']}")
        logger.info(f"📐 Perimeter updates: {self.sync_stats['perimeter_updates']}")
        logger.info(f"➡️ No changes required: {self.sync_stats['no_changes']}")
        logger.info(f"🇫🇷 France entière skipped: {self.sync_stats['fr_entiere_skipped']}")
        logger.info(f"⚠️ Errors: {self.sync_stats['errors']}")
        
        # Calculate success rate
        total_processed = self.sync_stats['api_matches'] + self.sync_stats['api_mismatches']
        if total_processed > 0:
            success_rate = (self.sync_stats['api_matches'] / total_processed) * 100
            logger.info(f"📈 API match rate: {success_rate:.1f}%")

def main():
    """Main function to run the synchronization."""
    parser = argparse.ArgumentParser(description='Synchronize ZLV establishments with Cerema data')
    parser.add_argument('--dry-run', action='store_true', default=True,
                       help='Run in dry-run mode (default: True)')
    parser.add_argument('--execute', action='store_true',
                       help='Execute actual updates (overrides --dry-run)')
    
    args = parser.parse_args()
    
    # Check for required files
    if not os.path.exists(LOCALITIES_CSV_FILE):
        logger.error(f"❌ Required file not found: {LOCALITIES_CSV_FILE}")
        logger.error("💡 Please ensure the localities.csv file is in the current directory")
        exit(1)
    
    # Check for required environment variable
    if not BEARER_TOKEN:
        logger.error("❌ CEREMA_API_TOKEN environment variable is required")
        logger.error("💡 Set it with: export CEREMA_API_TOKEN='your_token_here'")
        exit(1)
    
    # If --execute is specified, disable dry-run
    dry_run = not args.execute
    
    try:
        synchronizer = ZLVEstablishmentSynchronizer(dry_run=dry_run)
        synchronizer.run_synchronization()
        
    except KeyboardInterrupt:
        logger.info("⏹️ Synchronization interrupted by user")
    except Exception as e:
        logger.error(f"❌ Fatal error: {e}")
        exit(1)

if __name__ == "__main__":
    main()