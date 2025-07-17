#!/usr/bin/env python3
"""
Script to compare users in PostgreSQL database with those retrieved from API
and export missing users to a CSV file.
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
JSONL_FILE = "utilisateurs.jsonl"  # File created by previous script
CSV_OUTPUT = "utilisateurs_manquants.csv"

@dataclass
class DatabaseUser:
    """Represents a database user."""
    email: str
    first_name: Optional[str]
    last_name: Optional[str]
    establishment_id: Optional[int]
    establishment_name: Optional[str]

def load_api_emails(jsonl_file: str) -> Set[str]:
    """
    Load user emails from the API's JSON Lines file.
    
    Args:
        jsonl_file: Path to the JSON Lines file
        
    Returns:
        Set[str]: Set of normalized emails (lowercase)
    """
    api_emails = set()
    
    if not os.path.exists(jsonl_file):
        print(f"⚠️  The file {jsonl_file} does not exist!")
        print("🔄 Make sure to run the API retrieval script first.")
        return api_emails
    
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
                        api_emails.add(email.lower().strip())
                except json.JSONDecodeError as e:
                    print(f"⚠️  Invalid line {line_num} in {jsonl_file}: {e}")
                    
        print(f"📧 {len(api_emails)} emails loaded from API")
        
    except IOError as e:
        print(f"❌ Error reading {jsonl_file}: {e}")
    
    return api_emails

def get_database_users() -> List[DatabaseUser]:
    """
    Retrieve all users from PostgreSQL database with join.
    
    Returns:
        List[DatabaseUser]: List of database users
    """
    users = []
    
    # SQL query with join
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
        
        # Execute query
        print("🔍 Retrieving users from database...")
        cursor.execute(query)
        
        # Fetch results
        rows = cursor.fetchall()
        
        for row in rows:
            email, first_name, last_name, establishment_id, establishment_name = row
            users.append(DatabaseUser(
                email=email,
                first_name=first_name,
                last_name=last_name,
                establishment_id=establishment_id,
                establishment_name=establishment_name
            ))
        
        print(f"👥 {len(users)} users retrieved from database")
        
    except psycopg2.Error as e:
        print(f"❌ PostgreSQL error: {e}")
        return []
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return []
    finally:
        # Close connections
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()
        print("🔌 Connection closed")
    
    return users

def find_missing_users(db_users: List[DatabaseUser], api_emails: Set[str]) -> List[DatabaseUser]:
    """
    Find users present in database but missing from API.
    
    Args:
        db_users: List of database users
        api_emails: Set of emails present in API
        
    Returns:
        List[DatabaseUser]: Users missing from API
    """
    missing_users = []
    
    for user in db_users:
        # Normalize email for comparison
        normalized_email = user.email.lower().strip()
        
        if normalized_email not in api_emails:
            missing_users.append(user)
    
    print(f"🔍 {len(missing_users)} missing users detected")
    return missing_users

def export_to_csv(missing_users: List[DatabaseUser], output_file: str):
    """
    Export missing users to a CSV file.
    
    Args:
        missing_users: List of missing users
        output_file: Output CSV file path
    """
    if not missing_users:
        print("✅ No missing users to export!")
        return
    
    try:
        with open(output_file, 'w', newline='', encoding='utf-8') as csvfile:
            fieldnames = [
                'email', 
                'first_name', 
                'last_name', 
                'establishment_id', 
                'establishment_name'
            ]
            
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            
            # Write header
            writer.writeheader()
            
            # Write data
            for user in missing_users:
                writer.writerow({
                    'email': user.email,
                    'first_name': user.first_name or '',
                    'last_name': user.last_name or '',
                    'establishment_id': user.establishment_id or '',
                    'establishment_name': user.establishment_name or ''
                })
        
        print(f"📄 Successfully exported to {output_file}")
        print(f"📊 {len(missing_users)} missing users exported")
        
    except IOError as e:
        print(f"❌ Error during CSV export: {e}")

def generate_statistics(db_users: List[DatabaseUser], api_emails: Set[str], missing_users: List[DatabaseUser]):
    """
    Generate and display comparison statistics.
    
    Args:
        db_users: Database users
        api_emails: API emails
        missing_users: Missing users
    """
    total_db = len(db_users)
    total_api = len(api_emails)
    total_missing = len(missing_users)
    total_present = total_db - total_missing
    
    print(f"\n📊 === COMPARISON STATISTICS ===")
    print(f"👥 Users in database: {total_db}")
    print(f"📧 Users in API: {total_api}")
    print(f"✅ Users present in both: {total_present}")
    print(f"❌ Users missing from API: {total_missing}")
    
    if total_db > 0:
        coverage_percentage = (total_present / total_db) * 100
        print(f"📈 API coverage: {coverage_percentage:.1f}%")
    
    # Statistics by establishment for missing users
    if missing_users:
        establishments = {}
        for user in missing_users:
            est_name = user.establishment_name or "Undefined"
            establishments[est_name] = establishments.get(est_name, 0) + 1
        
        print(f"\n🏢 === BREAKDOWN BY ESTABLISHMENT (missing users) ===")
        for est_name, count in sorted(establishments.items(), key=lambda x: x[1], reverse=True):
            print(f"  {est_name}: {count} users")

def validate_config():
    """Validate configuration before execution."""
    if DB_CONFIG['database'] == 'your_db':
        print("⚠️  WARNING: You must configure the database parameters!")
        print("📝 Modify the DB_CONFIG variable with your actual connection information.")
        return False
    return True

def main():
    """Main function."""
    print("🔍 === DATABASE vs API COMPARISON ===\n")
    
    # Configuration validation
    if not validate_config():
        return
    
    try:
        # 1. Load emails from API
        print("📖 Step 1: Loading emails from API...")
        api_emails = load_api_emails(JSONL_FILE)
        
        if not api_emails:
            print("❌ Unable to load emails from API. Stopping script.")
            return
        
        # 2. Retrieve users from database
        print("\n🗄️  Step 2: Retrieving users from database...")
        db_users = get_database_users()
        
        if not db_users:
            print("❌ Unable to retrieve users from database. Stopping script.")
            return
        
        # 3. Identify missing users
        print("\n🔍 Step 3: Identifying missing users...")
        missing_users = find_missing_users(db_users, api_emails)
        
        # 4. Export to CSV
        print(f"\n📄 Step 4: Exporting to {CSV_OUTPUT}...")
        export_to_csv(missing_users, CSV_OUTPUT)
        
        # 5. Display statistics
        generate_statistics(db_users, api_emails, missing_users)
        
        print(f"\n🎉 === PROCESSING COMPLETED ===")
        
        if missing_users:
            print(f"📁 Generated file: {CSV_OUTPUT}")
            print(f"👀 Check the file to see details of missing users")
        else:
            print("✅ All database users are present in the API!")
        
    except KeyboardInterrupt:
        print(f"\n⏹️  Interrupted by user")
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")

if __name__ == "__main__":
    main()