#!/usr/bin/env python3
"""
Script to identify users present in the API with null cgu_valide
and export them to a CSV file with their database information.
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
CSV_OUTPUT = "utilisateurs_cgu_non_valide.csv"

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
    """Represents a database user."""
    email: str
    first_name: Optional[str]
    last_name: Optional[str]
    establishment_id: Optional[int]
    establishment_name: Optional[str]

# Remove unused UserWithInvalidCGU class

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

def get_all_users() -> Dict[str, DatabaseUser]:
    """
    Retrieves all users from the PostgreSQL database with join.
    
    Returns:
        Dict[str, DatabaseUser]: Dictionary with email as key and DatabaseUser as value
    """
    users = {}
    
    # SQL query with join to retrieve all users
    query = """
    SELECT 
        u.email,
        u.first_name,
        u.last_name,
        u.establishment_id,
        e.name as establishment_name
    FROM users u
    LEFT JOIN establishments e ON u.establishment_id = e.id
    WHERE u.email IS NOT NULL 
    AND u.email != ''
    ORDER BY u.email;
    """
    
    try:
        # Database connection
        print("🔌 Connecting to PostgreSQL database...")
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        # Query execution
        print("🔍 Retrieving all users from database...")
        cursor.execute(query)
        
        # Retrieving results
        rows = cursor.fetchall()
        
        for row in rows:
            email, first_name, last_name, establishment_id, establishment_name = row
            # Normalize email for key
            normalized_email = email.lower().strip()
            
            users[normalized_email] = DatabaseUser(
                email=email,
                first_name=first_name,
                last_name=last_name,
                establishment_id=establishment_id,
                establishment_name=establishment_name
            )
        
        print(f"👥 {len(users)} users retrieved from database")
        
    except psycopg2.Error as e:
        print(f"❌ PostgreSQL error: {e}")
        return {}
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return {}
    finally:
        # Connection cleanup
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()
        print("🔌 Connection closed")
    
    return users

def find_users_with_invalid_tos(
    db_users: Dict[str, DatabaseUser], 
    api_users: Dict[str, ApiUser]
) -> List[DatabaseUser]:
    """
    Finds users with null cgu_valide in the API.
    
    Args:
        db_users: Dictionary of database users (key = email)
        api_users: Dictionary of API users (key = email)
        
    Returns:
        List[DatabaseUser]: Users with invalid TOS
    """
    users_with_invalid_tos = []
    
    for email, api_user in api_users.items():
        # Check if cgu_valide is null
        if api_user.cgu_valide is None:
            # Look for corresponding user in database
            db_user = db_users.get(email)
            
            if db_user:
                users_with_invalid_tos.append(db_user)
    
    print(f"🔍 {len(users_with_invalid_tos)} users with invalid TOS found")
    return users_with_invalid_tos

def export_to_csv(users: List[DatabaseUser], output_file: str):
    """
    Exports users with invalid TOS to a CSV file.
    
    Args:
        users: List of users with invalid TOS
        output_file: Output CSV file path
    """
    if not users:
        print("✅ No users with invalid TOS to export!")
        return
    
    try:
        with open(output_file, 'w', newline='', encoding='utf-8') as csvfile:
            fieldnames = [
                'email',
                'first_name',
                'last_name', 
                'establishment_name'
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
                    'establishment_name': user.establishment_name or ''
                })
        
        print(f"📄 Export successful to {output_file}")
        print(f"📊 {len(users)} users with invalid TOS exported")
        
    except IOError as e:
        print(f"❌ Error during CSV export: {e}")

def generate_statistics(
    db_users: Dict[str, DatabaseUser], 
    api_users: Dict[str, ApiUser], 
    users_with_invalid_tos: List[DatabaseUser]
):
    """
    Generates and displays statistics about users with invalid TOS.
    
    Args:
        db_users: Database users
        api_users: API users
        users_with_invalid_tos: Users with invalid TOS
    """
    total_db = len(db_users)
    total_api = len(api_users)
    total_invalid_tos = len(users_with_invalid_tos)
    
    # Count total users with null cgu_valide in API
    total_api_invalid_tos = sum(1 for user in api_users.values() if user.cgu_valide is None)
    
    print(f"\n📊 === INVALID TOS STATISTICS ===")
    print(f"👥 Users in database: {total_db}")
    print(f"📧 Users in API: {total_api}")
    print(f"⚠️  API users with null TOS: {total_api_invalid_tos}")
    print(f"🎯 Users with null TOS present in database: {total_invalid_tos}")
    
    if total_api_invalid_tos > 0:
        coverage_percentage = (total_invalid_tos / total_api_invalid_tos) * 100
        print(f"📈 Database coverage for null TOS: {coverage_percentage:.1f}%")
    
    # Statistics on establishments
    if users_with_invalid_tos:
        with_establishment = sum(1 for u in users_with_invalid_tos if u.establishment_name)
        without_establishment = total_invalid_tos - with_establishment
        
        print(f"\n🔍 === ANALYSIS OF USERS WITH INVALID TOS ===")
        print(f"🏛️  With establishment: {with_establishment}")
        print(f"❌ Without establishment: {without_establishment}")
        
        # Distribution by establishment
        establishments = {}
        for user in users_with_invalid_tos:
            est_name = user.establishment_name or "Without establishment"
            establishments[est_name] = establishments.get(est_name, 0) + 1
        
        if establishments:
            print(f"\n🏛️  === DISTRIBUTION BY ESTABLISHMENT ===")
            for est_name, count in sorted(establishments.items(), key=lambda x: x[1], reverse=True)[:10]:
                print(f"  {est_name}: {count} users")

def validate_config():
    """Validates configuration before execution."""
    if DB_CONFIG['database'] == 'your_db':
        print("⚠️  WARNING: You must configure the database parameters!")
        print("📝 Modify the DB_CONFIG variable with your real connection information.")
        return False
    return True

def main():
    """Main function."""
    print("⚠️  === USERS WITH INVALID TOS ANALYSIS ===\n")
    
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
        
        # 2. Retrieve all users from database
        print("\n🗄️  Step 2: Retrieving all users...")
        db_users = get_all_users()
        
        if not db_users:
            print("❌ Unable to retrieve users from database. Stopping script.")
            return
        
        # 3. Identify users with invalid TOS
        print("\n🔍 Step 3: Identifying users with invalid TOS...")
        users_with_invalid_tos = find_users_with_invalid_tos(db_users, api_users)
        
        # 4. Export to CSV
        print(f"\n📄 Step 4: Export to {CSV_OUTPUT}...")
        export_to_csv(users_with_invalid_tos, CSV_OUTPUT)
        
        # 5. Display statistics
        generate_statistics(db_users, api_users, users_with_invalid_tos)
        
        print(f"\n🎉 === PROCESSING COMPLETED ===")
        
        if users_with_invalid_tos:
            print(f"📁 File generated: {CSV_OUTPUT}")
            print(f"👀 Check the file to see details of users with invalid TOS")
        else:
            print("✅ No users with invalid TOS found!")
        
    except KeyboardInterrupt:
        print(f"\n⏹️  User interruption")
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")

if __name__ == "__main__":
    main()