#!/usr/bin/env python3
"""
Script to identify deactivated users (expired date or invalid CGU)
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
CSV_OUTPUT = "utilisateurs_desactives.csv"

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
    date_expiration: Optional[str]  # API expiration date
    cgu_valide: Optional[str]  # API validated TOS
    deactivation_reason: Optional[str]  # Deactivation reason

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
                date_expiration=None,  # Will be filled with API data
                cgu_valide=None,  # Will be filled with API data
                deactivation_reason=None  # Will be determined during analysis
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

def find_deactivated_users(
    db_users: Dict[str, DatabaseUser], 
    api_users: Dict[str, ApiUser]
) -> List[DatabaseUser]:
    """
    Finds deactivated users (expired date or invalid TOS).
    
    Args:
        db_users: Dictionary of database users (key = email)
        api_users: Dictionary of API users (key = email)
        
    Returns:
        List[DatabaseUser]: Deactivated users
    """
    from datetime import datetime
    import dateutil.parser
    
    deactivated_users = []
    now = datetime.now()
    
    for email, api_user in api_users.items():
        # Look for corresponding user in database
        db_user = db_users.get(email)
        
        if db_user:
            deactivation_reasons = []
            
            # Check expiration date
            if api_user.date_expiration is not None:
                try:
                    # Parse expiration date
                    exp_date = dateutil.parser.parse(api_user.date_expiration.replace('Z', '+00:00'))
                    exp_date = exp_date.replace(tzinfo=None)
                    
                    # Check if date is in the past
                    if exp_date < now:
                        deactivation_reasons.append("Expired")
                except:
                    deactivation_reasons.append("Invalid expiration date")
            
            # Check TOS
            if api_user.cgu_valide is None:
                deactivation_reasons.append("TOS not validated")
            
            # If at least one deactivation reason exists
            if deactivation_reasons:
                # Add API info to DatabaseUser
                db_user.date_expiration = api_user.date_expiration
                db_user.cgu_valide = api_user.cgu_valide
                db_user.deactivation_reason = " + ".join(deactivation_reasons)
                deactivated_users.append(db_user)
    
    print(f"🔍 {len(deactivated_users)} deactivated users found")
    return deactivated_users

def export_to_csv(users: List[DatabaseUser], output_file: str):
    """
    Exports deactivated users to a CSV file.
    
    Args:
        users: List of deactivated users
        output_file: Output CSV file path
    """
    if not users:
        print("✅ No deactivated users to export!")
        return
    
    try:
        with open(output_file, 'w', newline='', encoding='utf-8') as csvfile:
            fieldnames = [
                'email',
                'first_name',
                'last_name', 
                'establishment_name',
                'date_expiration',
                'cgu_valide',
                'deactivation_reason'
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
                    'date_expiration': user.date_expiration or '',
                    'cgu_valide': user.cgu_valide or '',
                    'deactivation_reason': user.deactivation_reason or ''
                })
        
        print(f"📄 Export successful to {output_file}")
        print(f"📊 {len(users)} deactivated users exported")
        
    except IOError as e:
        print(f"❌ Error during CSV export: {e}")

def generate_statistics(
    db_users: Dict[str, DatabaseUser], 
    api_users: Dict[str, ApiUser], 
    deactivated_users: List[DatabaseUser]
):
    """
    Generates and displays statistics about deactivated users.
    
    Args:
        db_users: Database users
        api_users: API users
        deactivated_users: Deactivated users
    """
    total_db = len(db_users)
    total_api = len(api_users)
    total_deactivated = len(deactivated_users)
    
    print(f"\n📊 === DEACTIVATED USERS STATISTICS ===")
    print(f"👥 Users in database: {total_db}")
    print(f"📧 Users in API: {total_api}")
    print(f"❌ Deactivated users: {total_deactivated}")
    
    if total_api > 0:
        deactivation_percentage = (total_deactivated / total_api) * 100
        print(f"📈 Deactivation rate: {deactivation_percentage:.1f}%")
    
    # Analyze deactivation reasons
    if deactivated_users:
        reasons_count = {}
        establishment_count = {}
        
        for user in deactivated_users:
            # Count reasons
            reason = user.deactivation_reason or "Unknown reason"
            reasons_count[reason] = reasons_count.get(reason, 0) + 1
            
            # Count by establishment
            est_name = user.establishment_name or "Without establishment"
            establishment_count[est_name] = establishment_count.get(est_name, 0) + 1
        
        print(f"\n🔍 === DEACTIVATION REASONS ANALYSIS ===")
        for reason, count in sorted(reasons_count.items(), key=lambda x: x[1], reverse=True):
            print(f"  {reason}: {count} users")
        
        print(f"\n🏛️  === DISTRIBUTION BY ESTABLISHMENT ===")
        for est_name, count in sorted(establishment_count.items(), key=lambda x: x[1], reverse=True)[:10]:
            print(f"  {est_name}: {count} users")
        
        # Detailed statistics on deactivation types
        expired_only = sum(1 for u in deactivated_users if u.deactivation_reason == "Expired")
        tos_only = sum(1 for u in deactivated_users if u.deactivation_reason == "TOS not validated")
        both = sum(1 for u in deactivated_users if "+" in (u.deactivation_reason or ""))
        
        print(f"\n⚠️  === DEACTIVATION DETAILS ===")
        print(f"⏰ Only expired: {expired_only}")
        print(f"📋 Only TOS not validated: {tos_only}")
        print(f"🚫 Both issues: {both}")
        print(f"🔄 Other reasons: {total_deactivated - expired_only - tos_only - both}")

def validate_config():
    """Validates configuration before execution."""
    # No specific validation needed as we use default values
    print(f"🔧 Configuration: Database '{DB_CONFIG['database']}' on {DB_CONFIG['host']}:{DB_CONFIG['port']}")
    return True

def main():
    """Main function."""
    print("❌ === DEACTIVATED USERS ANALYSIS ===\n")
    
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
        
        # 3. Identify deactivated users
        print("\n🔍 Step 3: Identifying deactivated users...")
        deactivated_users = find_deactivated_users(db_users, api_users)
        
        # 4. Export to CSV
        print(f"\n📄 Step 4: Export to {CSV_OUTPUT}...")
        export_to_csv(deactivated_users, CSV_OUTPUT)
        
        # 5. Display statistics
        generate_statistics(db_users, api_users, deactivated_users)
        
        print(f"\n🎉 === PROCESSING COMPLETED ===")
        
        if deactivated_users:
            print(f"📁 File generated: {CSV_OUTPUT}")
            print(f"👀 Check the file to see details of deactivated users")
        else:
            print("✅ No deactivated users found!")
        
    except KeyboardInterrupt:
        print(f"\n⏹️  User interruption")
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")

if __name__ == "__main__":
    main()