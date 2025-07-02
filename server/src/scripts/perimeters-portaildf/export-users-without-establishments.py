#!/usr/bin/env python3
"""
Script to identify users present in the API but without establishment
attached in the database and export them to a CSV file.
"""

import psycopg2
import json
import csv
import os
from typing import Set, List, Dict, Optional
from dataclasses import dataclass
from pathlib import Path

# Database Configuration
DB_CONFIG = {
    'host': 'localhost',        # Modify according to your configuration
    'port': 5432,              # Default PostgreSQL port
    'database': 'copieprod',    # Your database name
    'user': 'postgres',         # PostgreSQL user
    'password': 'postgres'      # Password
}

# File Configuration
JSONL_FILE = "utilisateurs.jsonl"  # File created by the API script
CSV_OUTPUT = "utilisateurs_sans_etablissement.csv"

@dataclass
class ApiUser:
    """Represents an API user."""
    id_user: int
    email: str
    date_rattachement: Optional[str]
    structure: Optional[int]
    date_expiration: Optional[str]
    exterieur: bool
    gestionnaire: bool
    groupe: Optional[int]
    cgu_valide: Optional[str]
    str_mandataire: Optional[str]

@dataclass
class DatabaseUser:
    """Represents a database user without establishment."""
    email: str
    first_name: Optional[str]
    last_name: Optional[str]
    establishment_id: Optional[int]  # Will always be None for this script
    updated_at: Optional[str]

@dataclass
class UserWithoutEstablishment:
    """Represents a user without establishment with API and DB info."""
    # Database information
    email: str
    first_name: Optional[str]
    last_name: Optional[str]
    db_updated_at: Optional[str]
    
    # API information
    api_id_user: int
    api_structure: Optional[int]
    api_date_rattachement: Optional[str]
    api_exterieur: bool
    api_gestionnaire: bool
    api_groupe: Optional[int]
    api_cgu_valide: Optional[str]

def load_api_users(jsonl_file: str) -> Dict[str, ApiUser]:
    """
    Loads all users from the API JSON Lines file.
    
    Args:
        jsonl_file: Path to the JSON Lines file
        
    Returns:
        Dict[str, ApiUser]: Dictionary with email as key and ApiUser as value
    """
    api_users = {}
    
    if not os.path.exists(jsonl_file):
        print(f"⚠️  File {jsonl_file} does not exist!")
        print("🔄 Make sure to run the API retrieval script first.")
        return api_users
    
    try:
        with open(jsonl_file, 'r', encoding='utf-8') as f:
            for line_num, line in enumerate(f, 1):
                line = line.strip()
                if not line:
                    continue
                    
                try:
                    user_data = json.loads(line)
                    email = user_data.get('email')
                    if email:
                        # Normalize email to lowercase for comparison
                        normalized_email = email.lower().strip()
                        
                        api_user = ApiUser(
                            id_user=user_data.get('id_user'),
                            email=email,
                            date_rattachement=user_data.get('date_rattachement'),
                            structure=user_data.get('structure'),
                            date_expiration=user_data.get('date_expiration'),
                            exterieur=user_data.get('exterieur', False),
                            gestionnaire=user_data.get('gestionnaire', False),
                            groupe=user_data.get('groupe'),
                            cgu_valide=user_data.get('cgu_valide'),
                            str_mandataire=user_data.get('str_mandataire')
                        )
                        
                        api_users[normalized_email] = api_user
                        
                except json.JSONDecodeError as e:
                    print(f"⚠️  Invalid line {line_num} in {jsonl_file}: {e}")
                    
        print(f"📧 {len(api_users)} users loaded from API")
        
    except IOError as e:
        print(f"❌ Error reading {jsonl_file}: {e}")
    
    return api_users

def get_users_without_establishment() -> List[DatabaseUser]:
    """
    Retrieves all users without establishment from the PostgreSQL database.
    
    Returns:
        List[DatabaseUser]: List of users without establishment
    """
    users = []
    
    # SQL query for users without establishment
    query = """
    SELECT 
        email,
        first_name,
        last_name,
        establishment_id,
        updated_at
    FROM users 
    WHERE establishment_id IS NULL
    AND email IS NOT NULL 
    AND email != ''
    ORDER BY email;
    """
    
    try:
        # Database connection
        print("🔌 Connecting to PostgreSQL database...")
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        # Query execution
        print("🔍 Retrieving users without establishment...")
        cursor.execute(query)
        
        # Retrieving results
        rows = cursor.fetchall()
        
        for row in rows:
            email, first_name, last_name, establishment_id, updated_at = row
            users.append(DatabaseUser(
                email=email,
                first_name=first_name,
                last_name=last_name,
                establishment_id=establishment_id,
                updated_at=updated_at.isoformat() if updated_at else None
            ))
        
        print(f"👥 {len(users)} users without establishment found in database")
        
    except psycopg2.Error as e:
        print(f"❌ PostgreSQL error: {e}")
        return []
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return []
    finally:
        # Connection cleanup
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()
        print("🔌 Connection closed")
    
    return users

def find_api_users_without_establishment(
    db_users_no_est: List[DatabaseUser], 
    api_users: Dict[str, ApiUser]
) -> List[UserWithoutEstablishment]:
    """
    Finds users without establishment who are present in the API.
    
    Args:
        db_users_no_est: Users without establishment from database
        api_users: Dictionary of API users (key = email)
        
    Returns:
        List[UserWithoutEstablishment]: Users without establishment present in API
    """
    users_without_establishment = []
    
    for db_user in db_users_no_est:
        # Normalize email for comparison
        normalized_email = db_user.email.lower().strip()
        
        # Check if user is present in API
        if normalized_email in api_users:
            api_user = api_users[normalized_email]
            
            combined_user = UserWithoutEstablishment(
                # DB info
                email=db_user.email,
                first_name=db_user.first_name,
                last_name=db_user.last_name,
                db_updated_at=db_user.updated_at,
                
                # API info
                api_id_user=api_user.id_user,
                api_structure=api_user.structure,
                api_date_rattachement=api_user.date_rattachement,
                api_exterieur=api_user.exterieur,
                api_gestionnaire=api_user.gestionnaire,
                api_groupe=api_user.groupe,
                api_cgu_valide=api_user.cgu_valide
            )
            
            users_without_establishment.append(combined_user)
    
    print(f"🔍 {len(users_without_establishment)} users without establishment present in API")
    return users_without_establishment

def export_to_csv(users: List[UserWithoutEstablishment], output_file: str):
    """
    Exports users without establishment to a CSV file.
    
    Args:
        users: List of users without establishment
        output_file: Output CSV file path
    """
    if not users:
        print("✅ No users without establishment to export!")
        return
    
    try:
        with open(output_file, 'w', newline='', encoding='utf-8') as csvfile:
            fieldnames = [
                # Database information
                'email',
                'first_name',
                'last_name', 
                'db_updated_at',
                
                # API information
                'api_id_user',
                'api_structure',
                'api_date_rattachement',
                'api_exterieur',
                'api_gestionnaire',
                'api_groupe',
                'api_cgu_valide'
            ]
            
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            
            # Write header
            writer.writeheader()
            
            # Write data
            for user in users:
                writer.writerow({
                    'email': user.email,
                    'first_name': user.first_name or '',
                    'last_name': user.last_name or '',
                    'db_updated_at': user.db_updated_at or '',
                    'api_id_user': user.api_id_user,
                    'api_structure': user.api_structure or '',
                    'api_date_rattachement': user.api_date_rattachement or '',
                    'api_exterieur': user.api_exterieur,
                    'api_gestionnaire': user.api_gestionnaire,
                    'api_groupe': user.api_groupe or '',
                    'api_cgu_valide': user.api_cgu_valide or ''
                })
        
        print(f"📄 Export successful to {output_file}")
        print(f"📊 {len(users)} users without establishment exported")
        
    except IOError as e:
        print(f"❌ Error during CSV export: {e}")

def generate_statistics(
    db_users_no_est: List[DatabaseUser], 
    api_users: Dict[str, ApiUser], 
    users_without_establishment: List[UserWithoutEstablishment]
):
    """
    Generates and displays statistics about users without establishment.
    
    Args:
        db_users_no_est: Users without establishment in database
        api_users: API users
        users_without_establishment: Users without establishment present in API
    """
    total_db_no_est = len(db_users_no_est)
    total_api = len(api_users)
    total_api_no_est = len(users_without_establishment)
    
    print(f"\n📊 === USERS WITHOUT ESTABLISHMENT STATISTICS ===")
    print(f"🏢 Users without establishment in database: {total_db_no_est}")
    print(f"📧 Total users in API: {total_api}")
    print(f"🎯 Users without establishment present in API: {total_api_no_est}")
    
    if total_db_no_est > 0:
        coverage_percentage = (total_api_no_est / total_db_no_est) * 100
        print(f"📈 API coverage (without establishment): {coverage_percentage:.1f}%")
    
    # Statistics on types of users without establishment
    if users_without_establishment:
        gestionnaires = sum(1 for u in users_without_establishment if u.api_gestionnaire)
        exterieurs = sum(1 for u in users_without_establishment if u.api_exterieur)
        avec_structure_api = sum(1 for u in users_without_establishment if u.api_structure)
        
        print(f"\n🔍 === ANALYSIS OF USERS WITHOUT ESTABLISHMENT ===")
        print(f"👔 Managers: {gestionnaires}")
        print(f"🏢 External users: {exterieurs}")
        print(f"📋 With API structure defined: {avec_structure_api}")
        
        # Distribution by API structure
        if avec_structure_api > 0:
            structures = {}
            for user in users_without_establishment:
                if user.api_structure:
                    structures[user.api_structure] = structures.get(user.api_structure, 0) + 1
            
            print(f"\n📊 === DISTRIBUTION BY API STRUCTURE ===")
            for structure_id, count in sorted(structures.items(), key=lambda x: x[1], reverse=True)[:10]:
                print(f"  Structure {structure_id}: {count} users")

def validate_config():
    """Validates configuration before execution."""
    if DB_CONFIG['database'] == 'your_db':
        print("⚠️  WARNING: You must configure the database parameters!")
        print("📝 Modify the DB_CONFIG variable with your real connection information.")
        return False
    return True

def main():
    """Main function."""
    print("🏢 === USERS WITHOUT ESTABLISHMENT ANALYSIS ===\n")
    
    # Configuration validation
    if not validate_config():
        return
    
    try:
        # 1. Load all users from API
        print("📖 Step 1: Loading users from API...")
        api_users = load_api_users(JSONL_FILE)
        
        if not api_users:
            print("❌ Unable to load users from API. Stopping script.")
            return
        
        # 2. Retrieve users without establishment from database
        print("\n🗄️  Step 2: Retrieving users without establishment...")
        db_users_no_est = get_users_without_establishment()
        
        if not db_users_no_est:
            print("✅ No users without establishment found in database!")
            return
        
        # 3. Identify users without establishment present in API
        print("\n🔍 Step 3: Identifying users without establishment in API...")
        users_without_establishment = find_api_users_without_establishment(db_users_no_est, api_users)
        
        # 4. Export to CSV
        print(f"\n📄 Step 4: Export to {CSV_OUTPUT}...")
        export_to_csv(users_without_establishment, CSV_OUTPUT)
        
        # 5. Display statistics
        generate_statistics(db_users_no_est, api_users, users_without_establishment)
        
        print(f"\n🎉 === PROCESSING COMPLETED ===")
        
        if users_without_establishment:
            print(f"📁 File generated: {CSV_OUTPUT}")
            print(f"👀 Check the file to see details of users without establishment")
        else:
            print("✅ No users without establishment present in API!")
        
    except KeyboardInterrupt:
        print(f"\n⏹️  User interruption")
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")

if __name__ == "__main__":
    main()