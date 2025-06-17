#!/usr/bin/env python3
"""
Script to identify users present in the API with non-null date_expiration
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
    'database': 'copieprod',    # Default database
    'user': 'postgres',         # Default user
    'password': 'postgres'      # Default password
}

# File Configuration
JSONL_FILE = "utilisateurs.jsonl"  # File created by the API script
CSV_OUTPUT = "utilisateurs_avec_expiration.csv"

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
    date_expiration: Optional[str]  # Adding expiration date

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
                establishment_name=establishment_name,
                date_expiration=None  # Will be filled later with API data
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

def find_users_with_expiration_date(
    db_users: Dict[str, DatabaseUser], 
    api_users: Dict[str, ApiUser]
) -> List[DatabaseUser]:
    """
    Finds users with non-null date_expiration in the API.
    
    Args:
        db_users: Dictionary of database users (key = email)
        api_users: Dictionary of API users (key = email)
        
    Returns:
        List[DatabaseUser]: Users with expiration date
    """
    users_with_expiration = []
    
    for email, api_user in api_users.items():
        # Check if date_expiration is not null
        if api_user.date_expiration is not None:
            # Look for corresponding user in database
            db_user = db_users.get(email)
            
            if db_user:
                # Add API expiration date to DatabaseUser
                db_user.date_expiration = api_user.date_expiration
                users_with_expiration.append(db_user)
    
    print(f"🔍 {len(users_with_expiration)} users with expiration date found")
    return users_with_expiration

def export_to_csv(users: List[DatabaseUser], output_file: str):
    """
    Exports users with expiration date to a CSV file.
    
    Args:
        users: List of users with expiration date
        output_file: Output CSV file path
    """
    if not users:
        print("✅ No users with expiration date to export!")
        return
    
    try:
        with open(output_file, 'w', newline='', encoding='utf-8') as csvfile:
            fieldnames = [
                'email',
                'first_name',
                'last_name', 
                'establishment_name',
                'date_expiration'
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
                    'establishment_name': user.establishment_name or '',
                    'date_expiration': user.date_expiration or ''
                })
        
        print(f"📄 Export successful to {output_file}")
        print(f"📊 {len(users)} users with expiration date exported")
        
    except IOError as e:
        print(f"❌ Error during CSV export: {e}")

def generate_statistics(
    db_users: Dict[str, DatabaseUser], 
    api_users: Dict[str, ApiUser], 
    users_with_expiration: List[DatabaseUser]
):
    """
    Generates and displays statistics about users with expiration date.
    
    Args:
        db_users: Database users
        api_users: API users
        users_with_expiration: Users with expiration date
    """
    total_db = len(db_users)
    total_api = len(api_users)
    total_expiration = len(users_with_expiration)
    
    # Count total users with non-null date_expiration in API
    total_api_expiration = sum(1 for user in api_users.values() if user.date_expiration is not None)
    
    print(f"\n📊 === USERS WITH EXPIRATION DATE STATISTICS ===")
    print(f"👥 Users in database: {total_db}")
    print(f"📧 Users in API: {total_api}")
    print(f"⏰ API users with expiration date: {total_api_expiration}")
    print(f"🎯 Users with expiration present in database: {total_expiration}")
    
    if total_api_expiration > 0:
        coverage_percentage = (total_expiration / total_api_expiration) * 100
        print(f"📈 Database coverage for users with expiration: {coverage_percentage:.1f}%")
    
    # Statistics on establishments
    if users_with_expiration:
        with_establishment = sum(1 for u in users_with_expiration if u.establishment_name)
        without_establishment = total_expiration - with_establishment
        
        print(f"\n🔍 === ANALYSIS OF USERS WITH EXPIRATION DATE ===")
        print(f"🏛️  With establishment: {with_establishment}")
        print(f"❌ Without establishment: {without_establishment}")
        
        # Analyze expiration dates
        if users_with_expiration:
            from datetime import datetime
            import dateutil.parser
            
            # Count expirations by period
            expired = 0
            expires_soon = 0  # In the next 30 days
            expires_later = 0
            invalid_dates = 0
            
            now = datetime.now()
            
            for user in users_with_expiration:
                try:
                    if user.date_expiration:
                        # Parse date (expected ISO format)
                        exp_date = dateutil.parser.parse(user.date_expiration.replace('Z', '+00:00'))
                        # Convert to naive datetime for comparison
                        exp_date = exp_date.replace(tzinfo=None)
                        
                        days_until_expiry = (exp_date - now).days
                        
                        if days_until_expiry < 0:
                            expired += 1
                        elif days_until_expiry <= 30:
                            expires_soon += 1
                        else:
                            expires_later += 1
                except:
                    invalid_dates += 1
            
            print(f"\n⏰ === EXPIRATION DATE ANALYSIS ===")
            print(f"❌ Already expired: {expired}")
            print(f"⚠️  Expire within 30 days: {expires_soon}")
            print(f"📅 Expire later: {expires_later}")
            if invalid_dates > 0:
                print(f"🔄 Invalid dates: {invalid_dates}")
        
        # Distribution by establishment
        establishments = {}
        for user in users_with_expiration:
            est_name = user.establishment_name or "Without establishment"
            establishments[est_name] = establishments.get(est_name, 0) + 1
        
        if establishments:
            print(f"\n🏛️  === DISTRIBUTION BY ESTABLISHMENT ===")
            for est_name, count in sorted(establishments.items(), key=lambda x: x[1], reverse=True)[:10]:
                print(f"  {est_name}: {count} users")

def validate_config():
    """Validates configuration before execution."""
    # No specific validation needed as we use default values
    print(f"🔧 Configuration: Database '{DB_CONFIG['database']}' on {DB_CONFIG['host']}:{DB_CONFIG['port']}")
    return True

def main():
    """Main function."""
    print("⏰ === USERS WITH EXPIRATION DATE ANALYSIS ===\n")
    
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
        
        # 3. Identify users with expiration date
        print("\n🔍 Step 3: Identifying users with expiration date...")
        users_with_expiration = find_users_with_expiration_date(db_users, api_users)
        
        # 4. Export to CSV
        print(f"\n📄 Step 4: Export to {CSV_OUTPUT}...")
        export_to_csv(users_with_expiration, CSV_OUTPUT)
        
        # 5. Display statistics
        generate_statistics(db_users, api_users, users_with_expiration)
        
        print(f"\n🎉 === PROCESSING COMPLETED ===")
        
        if users_with_expiration:
            print(f"📁 File generated: {CSV_OUTPUT}")
            print(f"👀 Check the file to see details of users with expiration date")
        else:
            print("✅ No users with expiration date found!")
        
    except KeyboardInterrupt:
        print(f"\n⏹️  User interruption")
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")

if __name__ == "__main__":
    main()