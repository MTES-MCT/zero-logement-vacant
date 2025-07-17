#!/usr/bin/env python3
"""
Script to analyze LOVAC access of structures used by users
present in the database and export structures with expired or null access to a CSV file.
"""

import json
import csv
import os
import psycopg2
from typing import Dict, List, Optional, Set
from dataclasses import dataclass
from datetime import datetime
import dateutil.parser

# Database Configuration
DB_CONFIG = {
    'host': 'b1a5hll4wc3chl1utqxz-postgresql.services.clever-cloud.com',
    'port': 7473,
    'database': 'b1a5hll4wc3chl1utqxz',
    'user': 'uzkjxisxc0hkyswfp1d6',
    'password': '1ndLae9c7BAOUwgBRC3j'
}

# File Configuration
USERS_JSONL_FILE = "utilisateurs.jsonl"
STRUCTURES_JSONL_FILE = "structures.jsonl"
CSV_OUTPUT = "structures_acces_expire.csv"

@dataclass
class DatabaseUser:
    """Represents a database user."""
    id: int
    email: str
    first_name: Optional[str]
    last_name: Optional[str]
    establishment_id: Optional[int]

@dataclass
class User:
    """Represents an API user."""
    id_user: int
    email: str
    structure: Optional[int]
    gestionnaire: bool = False
    exterieur: bool = False
    # Database information if present
    db_user: Optional[DatabaseUser] = None

@dataclass
class Structure:
    """Represents a structure."""
    id: int
    name: str
    type: Optional[str]
    acces_lovac: Optional[str]
    departement: Optional[str] = None
    region: Optional[str] = None
    siret: Optional[str] = None

@dataclass
class StructureWithUsers:
    """Represents a structure with its associated users."""
    structure: Structure
    users: List[User]
    access_status: str  # 'expired', 'null', 'valid'
    access_issue: str   # Problem description

def get_database_users() -> Dict[str, DatabaseUser]:
    """
    Retrieves all users from the PostgreSQL database.
    
    Returns:
        Dict[str, DatabaseUser]: Dictionary with normalized email as key
    """
    users = {}
    
    query = """
    SELECT 
        id,
        email,
        first_name,
        last_name,
        establishment_id
    FROM users 
    WHERE email IS NOT NULL 
    AND email != ''
    AND deleted_at IS NULL
    ORDER BY email;
    """
    
    try:
        print("🔌 Connecting to PostgreSQL database...")
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        print("🔍 Retrieving users from database...")
        cursor.execute(query)
        
        rows = cursor.fetchall()
        
        for row in rows:
            user_id, email, first_name, last_name, establishment_id = row
            normalized_email = email.lower().strip()
            
            users[normalized_email] = DatabaseUser(
                id=user_id,
                email=email,
                first_name=first_name,
                last_name=last_name,
                establishment_id=establishment_id
            )
        
        print(f"👥 {len(users)} users retrieved from database")
        
    except psycopg2.Error as e:
        print(f"❌ PostgreSQL error: {e}")
        return {}
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return {}
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()
        print("🔌 Connection closed")
    
    return users

def load_users(filename: str, db_users: Dict[str, DatabaseUser]) -> List[User]:
    """
    Loads users from JSON Lines file and filters them by database presence.
    
    Args:
        filename: Path to the utilisateurs.jsonl file
        db_users: Dictionary of database users
        
    Returns:
        List[User]: List of users present in database
    """
    api_users = []
    users_in_db = []
    users_not_in_db = []
    
    if not os.path.exists(filename):
        print(f"❌ File {filename} does not exist!")
        return users_in_db
    
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            for line_num, line in enumerate(f, 1):
                line = line.strip()
                if not line:
                    continue
                    
                try:
                    user_data = json.loads(line)
                    
                    email = user_data.get('email', '').lower().strip()
                    
                    if not email:
                        continue
                    
                    user = User(
                        id_user=user_data.get('id_user'),
                        email=user_data.get('email', ''),
                        structure=user_data.get('structure'),
                        gestionnaire=user_data.get('gestionnaire', False),
                        exterieur=user_data.get('exterieur', False)
                    )
                    
                    if user.id_user:
                        api_users.append(user)
                        
                        # Check if user is present in database
                        db_user = db_users.get(email)
                        if db_user:
                            user.db_user = db_user
                            users_in_db.append(user)
                        else:
                            users_not_in_db.append(user)
                        
                except json.JSONDecodeError as e:
                    print(f"⚠️  Invalid line {line_num} in {filename}: {e}")
                    
        print(f"📧 {len(api_users)} users loaded from API")
        print(f"✅ {len(users_in_db)} users present in database")
        print(f"❌ {len(users_not_in_db)} users absent from database")
        
        if users_not_in_db:
            print(f"⚠️  API users not found in database (first 10):")
            for i, user in enumerate(users_not_in_db[:10]):
                print(f"  - {user.email} (API ID: {user.id_user})")
            if len(users_not_in_db) > 10:
                print(f"  ... and {len(users_not_in_db) - 10} others")
        
    except IOError as e:
        print(f"❌ Error reading {filename}: {e}")
    
    return users_in_db

def load_structures(filename: str) -> Dict[int, Structure]:
    """
    Loads all structures from JSON Lines file.
    
    Args:
        filename: Path to the structures.jsonl file
        
    Returns:
        Dict[int, Structure]: Dictionary with structure_id as key
    """
    structures = {}
    
    if not os.path.exists(filename):
        print(f"❌ File {filename} does not exist!")
        print("💡 Make sure to run the structure retrieval script first.")
        return structures
    
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            for line_num, line in enumerate(f, 1):
                line = line.strip()
                if not line:
                    continue
                    
                try:
                    structure_data = json.loads(line)
                    
                    # Get structure ID (try different fields)
                    structure_id = structure_data.get('id') or structure_data.get('id_structure')
                    
                    if structure_id:
                        structure = Structure(
                            id=structure_id,
                            name=structure_data.get('raison_sociale', structure_data.get('name', 'Unknown structure')),
                            type=structure_data.get('type'),
                            acces_lovac=structure_data.get('acces_lovac'),
                            departement=structure_data.get('departement'),
                            region=structure_data.get('region'),
                            siret=structure_data.get('siret')
                        )
                        
                        structures[structure_id] = structure
                        
                except json.JSONDecodeError as e:
                    print(f"⚠️  Invalid line {line_num} in {filename}: {e}")
                    
        print(f"🏢 {len(structures)} structures loaded")
        
    except IOError as e:
        print(f"❌ Error reading {filename}: {e}")
    
    return structures

def analyze_structure_access(structure: Structure) -> tuple[str, str]:
    """
    Analyzes the LOVAC access of a structure.
    
    Args:
        structure: Structure to analyze
        
    Returns:
        tuple: (status, description)
    """
    if structure.acces_lovac is None:
        return ('null', 'Accès LOVAC non défini')
    
    if not structure.acces_lovac.strip():
        return ('null', 'Accès LOVAC vide')
    
    try:
        # Parse LOVAC access date
        access_date = dateutil.parser.parse(structure.acces_lovac.replace('Z', '+00:00'))
        access_date = access_date.replace(tzinfo=None)
        now = datetime.now()
        
        if access_date <= now:
            days_expired = (now - access_date).days
            return ('expired', f'Accès expiré depuis {days_expired} jour(s)')
        else:
            days_remaining = (access_date - now).days
            return ('valid', f'Accès valide pour {days_remaining} jour(s) supplémentaire(s)')
            
    except Exception as e:
        return ('invalid', f'Date LOVAC invalide: {str(e)}')

def find_structures_with_users(users: List[User], structures: Dict[int, Structure]) -> List[StructureWithUsers]:
    """
    Finds structures used by users and analyzes their access.
    
    Args:
        users: List of users
        structures: Dictionary of structures
        
    Returns:
        List[StructureWithUsers]: Structures with their users and access status
    """
    # Group users by structure
    users_by_structure = {}
    structures_used = set()
    
    for user in users:
        if user.structure:
            structures_used.add(user.structure)
            if user.structure not in users_by_structure:
                users_by_structure[user.structure] = []
            users_by_structure[user.structure].append(user)
    
    print(f"🔍 {len(structures_used)} structures used by users")
    
    # Analyze each used structure
    structures_with_users = []
    missing_structures = set()
    
    for structure_id in structures_used:
        structure = structures.get(structure_id)
        
        if structure:
            users_list = users_by_structure[structure_id]
            access_status, access_issue = analyze_structure_access(structure)
            
            structure_with_users = StructureWithUsers(
                structure=structure,
                users=users_list,
                access_status=access_status,
                access_issue=access_issue
            )
            
            structures_with_users.append(structure_with_users)
        else:
            missing_structures.add(structure_id)
    
    if missing_structures:
        print(f"⚠️  {len(missing_structures)} structures used but not found in structures.jsonl file:")
        for missing_id in sorted(missing_structures):
            users_count = len(users_by_structure[missing_id])
            print(f"  Structure ID {missing_id}: {users_count} user(s)")
    
    return structures_with_users

def filter_problematic_structures(structures_with_users: List[StructureWithUsers]) -> List[StructureWithUsers]:
    """
    Filters structures with LOVAC access problems.
    
    Args:
        structures_with_users: List of all structures with users
        
    Returns:
        List[StructureWithUsers]: Structures with expired or null access
    """
    problematic = []
    
    for struct_with_users in structures_with_users:
        if struct_with_users.access_status in ['null', 'expired', 'invalid']:
            problematic.append(struct_with_users)
    
    print(f"❌ {len(problematic)} structures with access problems found")
    
    return problematic

def export_to_csv(problematic_structures: List[StructureWithUsers], output_file: str):
    """
    Exports problematic structures to a CSV file.
    
    Args:
        problematic_structures: Structures with access problems
        output_file: Output CSV file path
    """
    if not problematic_structures:
        print("✅ No problematic structures to export!")
        return
    
    try:
        with open(output_file, 'w', newline='', encoding='utf-8') as csvfile:
            fieldnames = [
                'structure_id',
                'structure_name',
                'access_issue',
                'siret',
                'users_count',
                'users_emails',
                'db_establishment_ids'
            ]
            
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            writer.writeheader()
            
            for struct_with_users in problematic_structures:
                structure = struct_with_users.structure
                users = struct_with_users.users
                
                # Create email list (limited to avoid overly long fields)
                emails = [u.email for u in users[:15]]  # Increased to 15 emails
                if len(users) > 15:
                    emails.append(f"... and {len(users) - 15} others")
                
                # Get establishment_ids from database
                establishment_ids = []
                for u in users:
                    if u.db_user and u.db_user.establishment_id:
                        establishment_ids.append(str(u.db_user.establishment_id))
                
                writer.writerow({
                    'structure_id': structure.id,
                    'structure_name': structure.name,
                    'access_issue': struct_with_users.access_issue,
                    'siret': structure.siret or '',
                    'users_count': len(users),
                    'users_emails': '; '.join(emails),
                    'db_establishment_ids': '; '.join(set(establishment_ids)) if establishment_ids else ''
                })
        
        print(f"📄 Export successful to {output_file}")
        print(f"📊 {len(problematic_structures)} problematic structures exported")
        
    except IOError as e:
        print(f"❌ Error during CSV export: {e}")

def generate_statistics(structures_with_users: List[StructureWithUsers], problematic_structures: List[StructureWithUsers]):
    """
    Generates and displays statistics about the analysis.
    
    Args:
        structures_with_users: All structures with users
        problematic_structures: Problematic structures
    """
    total_structures = len(structures_with_users)
    total_problematic = len(problematic_structures)
    
    # Count by problem type
    null_access = sum(1 for s in problematic_structures if s.access_status == 'null')
    expired_access = sum(1 for s in problematic_structures if s.access_status == 'expired')
    invalid_access = sum(1 for s in problematic_structures if s.access_status == 'invalid')
    
    # Count affected users
    total_users_affected = sum(len(s.users) for s in problematic_structures)
    total_managers_affected = sum(sum(1 for u in s.users if u.gestionnaire) for s in problematic_structures)
    
    print(f"\n📊 === ANALYSIS STATISTICS ===")
    print(f"🏢 Structures analyzed: {total_structures}")
    print(f"❌ Problematic structures: {total_problematic}")
    
    if total_structures > 0:
        percentage = (total_problematic / total_structures) * 100
        print(f"📈 Percentage of problematic structures: {percentage:.1f}%")
    
    print(f"\n🔍 === PROBLEM DETAILS ===")
    print(f"⚪ LOVAC access null/empty: {null_access}")
    print(f"⏰ LOVAC access expired: {expired_access}")
    print(f"🔄 LOVAC access invalid: {invalid_access}")
    
    print(f"\n👥 === USER IMPACT ===")
    print(f"Users affected: {total_users_affected}")
    print(f"Managers affected: {total_managers_affected}")
    
    # Top 10 most problematic structures (by number of users)
    if problematic_structures:
        sorted_structures = sorted(problematic_structures, key=lambda x: len(x.users), reverse=True)
        
        print(f"\n🏆 === TOP 10 MOST IMPACTED STRUCTURES ===")
        for i, struct_with_users in enumerate(sorted_structures[:10], 1):
            structure = struct_with_users.structure
            users_count = len(struct_with_users.users)
            print(f"  {i}. {structure.name} (ID: {structure.id}): {users_count} user(s) - {struct_with_users.access_issue}")

def main():
    """Main function."""
    print("🔍 === LOVAC STRUCTURE ACCESS ANALYSIS (DATABASE SCOPE) ===\n")
    
    try:
        # 1. Load users from database
        print("🗄️  Step 1: Loading users from database...")
        db_users = get_database_users()
        
        if not db_users:
            print("❌ No users in database. Stopping script.")
            return
        
        # 2. Load API users and filter by database presence
        print("\n📖 Step 2: Loading and filtering API users...")
        users = load_users(USERS_JSONL_FILE, db_users)
        
        if not users:
            print("❌ No API users present in database. Stopping script.")
            return
        
        # 3. Load structures
        print("\n🏢 Step 3: Loading structures...")
        structures = load_structures(STRUCTURES_JSONL_FILE)
        
        if not structures:
            print("❌ No structures loaded. Stopping script.")
            return
        
        # 4. Analyze used structures (only for users in database)
        print("\n🔍 Step 4: Analyzing LOVAC access...")
        structures_with_users = find_structures_with_users(users, structures)
        
        # 5. Filter problematic structures
        print("\n❌ Step 5: Identifying problematic structures...")
        problematic_structures = filter_problematic_structures(structures_with_users)
        
        # 6. Export to CSV
        print(f"\n📄 Step 6: Export to {CSV_OUTPUT}...")
        export_to_csv(problematic_structures, CSV_OUTPUT)
        
        # 7. Display statistics
        generate_statistics(structures_with_users, problematic_structures)
        
        print(f"\n🎉 === PROCESSING COMPLETED ===")
        print(f"🎯 Scope: Users present in database only")
        
        if problematic_structures:
            print(f"📁 File generated: {CSV_OUTPUT}")
            print(f"👀 Check the file to see details of problematic structures")
        else:
            print("✅ All used structures (database scope) have valid LOVAC access!")
        
    except KeyboardInterrupt:
        print(f"\n⏹️  User interruption")
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")

if __name__ == "__main__":
    main()