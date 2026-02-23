#!/usr/bin/env python3
"""
Script to fetch groups and perimeters from Cerema DF Portal API
for ZLV users analysis.

Usage:
    # Set credentials
    export CEREMA_USERNAME="your_username"
    export CEREMA_PASSWORD="your_password"

    # Run script
    python fetch-groups-perimeters.py

    # Or with specific group IDs file
    python fetch-groups-perimeters.py --groups-file groupe_ids.txt
"""

import requests
import json
import os
import sys
import time
import argparse
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, Set, List

# Configuration
API_BASE_URL = "https://portaildf.cerema.fr/api"
DELAY_BETWEEN_REQUESTS = 0.3  # seconds
MAX_RETRIES = 3

def authenticate(username: str, password: str) -> Optional[str]:
    """Authenticate with Portail DF API and return token."""
    print("🔐 Authenticating with Portail DF API...")

    try:
        response = requests.post(
            f"{API_BASE_URL}/api-token-auth/",
            data={"username": username, "password": password}
        )

        if response.status_code == 200:
            token = response.json().get("token")
            print("✅ Authentication successful")
            return token
        else:
            print(f"❌ Authentication failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Authentication error: {e}")
        return None

def fetch_with_retry(url: str, headers: dict, retries: int = MAX_RETRIES) -> Optional[dict]:
    """Fetch URL with retry logic."""
    for attempt in range(retries):
        try:
            response = requests.get(url, headers=headers, timeout=30)
            if response.status_code == 200:
                return response.json()
            elif response.status_code == 404:
                return None
            else:
                print(f"   ⚠️ HTTP {response.status_code} for {url}")
                if attempt < retries - 1:
                    time.sleep(2 ** attempt)
        except Exception as e:
            print(f"   ⚠️ Error fetching {url}: {e}")
            if attempt < retries - 1:
                time.sleep(2 ** attempt)
    return None

def get_zlv_group_ids(users_jsonl_path: str, zlv_emails_path: str) -> Set[int]:
    """Extract group IDs for ZLV users from users.jsonl."""
    print("\n📋 Loading ZLV user emails...")

    # Load ZLV emails
    zlv_emails = set()
    with open(zlv_emails_path, 'r') as f:
        for line in f:
            parts = line.strip().split(',')
            if parts:
                zlv_emails.add(parts[0].lower())

    print(f"   Found {len(zlv_emails)} ZLV emails")

    # Load Portail DF users and extract group IDs for ZLV users
    print(f"\n📋 Loading Portail DF users from {users_jsonl_path}...")

    group_ids = set()
    matched = 0

    with open(users_jsonl_path, 'r') as f:
        for line in f:
            user = json.loads(line)
            email = user.get('email', '').lower()
            if email in zlv_emails:
                matched += 1
                groupe_id = user.get('groupe')
                if groupe_id:
                    group_ids.add(groupe_id)

    print(f"   Matched {matched} ZLV users in Portail DF")
    print(f"   Found {len(group_ids)} distinct group IDs")

    return group_ids

def fetch_all_groups(token: str, group_ids: Set[int], output_file: str) -> Dict[int, dict]:
    """Fetch all groups and save to JSONL file."""
    print(f"\n📦 Fetching {len(group_ids)} groups...")

    headers = {
        "Authorization": f"Token {token}",
        "Content-Type": "application/json"
    }

    groups = {}
    perimeter_ids = set()

    # Load existing groups if file exists (for resume)
    existing_ids = set()
    if Path(output_file).exists():
        with open(output_file, 'r') as f:
            for line in f:
                g = json.loads(line)
                existing_ids.add(g['id_groupe'])
                groups[g['id_groupe']] = g
                if g.get('perimetre'):
                    perimeter_ids.add(g['perimetre'])
        print(f"   Loaded {len(existing_ids)} existing groups from cache")

    # Fetch missing groups
    to_fetch = group_ids - existing_ids
    print(f"   Fetching {len(to_fetch)} new groups...")

    with open(output_file, 'a') as f:
        for i, group_id in enumerate(sorted(to_fetch)):
            if (i + 1) % 100 == 0:
                print(f"   Progress: {i + 1}/{len(to_fetch)} groups...")

            data = fetch_with_retry(f"{API_BASE_URL}/groupes/{group_id}/", headers)

            if data:
                group = {
                    'id_groupe': data.get('id_groupe', group_id),
                    'nom': data.get('nom'),
                    'structure': data.get('structure'),
                    'perimetre': data.get('perimetre'),
                    'niveau_acces': data.get('niveau_acces'),
                    'df_ano': data.get('df_ano'),
                    'df_non_ano': data.get('df_non_ano'),
                    'lovac': data.get('lovac')
                }
                groups[group_id] = group
                f.write(json.dumps(group) + '\n')

                if group.get('perimetre'):
                    perimeter_ids.add(group['perimetre'])

            time.sleep(DELAY_BETWEEN_REQUESTS)

    print(f"✅ Fetched {len(groups)} groups total")
    print(f"   Found {len(perimeter_ids)} distinct perimeter IDs")

    return groups, perimeter_ids

def fetch_all_perimeters(token: str, perimeter_ids: Set[int], output_file: str) -> Dict[int, dict]:
    """Fetch all perimeters and save to JSONL file."""
    print(f"\n🗺️ Fetching {len(perimeter_ids)} perimeters...")

    headers = {
        "Authorization": f"Token {token}",
        "Content-Type": "application/json"
    }

    perimeters = {}

    # Load existing perimeters if file exists (for resume)
    existing_ids = set()
    if Path(output_file).exists():
        with open(output_file, 'r') as f:
            for line in f:
                p = json.loads(line)
                existing_ids.add(p['perimetre_id'])
                perimeters[p['perimetre_id']] = p
        print(f"   Loaded {len(existing_ids)} existing perimeters from cache")

    # Fetch missing perimeters
    to_fetch = perimeter_ids - existing_ids
    print(f"   Fetching {len(to_fetch)} new perimeters...")

    with open(output_file, 'a') as f:
        for i, perim_id in enumerate(sorted(to_fetch)):
            if (i + 1) % 100 == 0:
                print(f"   Progress: {i + 1}/{len(to_fetch)} perimeters...")

            data = fetch_with_retry(f"{API_BASE_URL}/perimetres/{perim_id}/", headers)

            if data:
                perimeter = {
                    'perimetre_id': data.get('perimetre_id', perim_id),
                    'origine': data.get('origine'),
                    'fr_entiere': data.get('fr_entiere', False),
                    'reg': data.get('reg', []),
                    'dep': data.get('dep', []),
                    'epci': data.get('epci', []),
                    'comm': data.get('comm', [])
                }
                perimeters[perim_id] = perimeter
                f.write(json.dumps(perimeter) + '\n')

            time.sleep(DELAY_BETWEEN_REQUESTS)

    print(f"✅ Fetched {len(perimeters)} perimeters total")

    return perimeters

def analyze_perimeters(
    zlv_emails_path: str,
    users_jsonl_path: str,
    groups: Dict[int, dict],
    perimeters: Dict[int, dict]
):
    """Analyze perimeter types for ZLV users."""
    print("\n" + "=" * 80)
    print("📊 ANALYSE DES PÉRIMÈTRES")
    print("=" * 80)

    # Load ZLV users with kind
    zlv_users = {}
    with open(zlv_emails_path, 'r') as f:
        for line in f:
            parts = line.strip().split(',')
            if len(parts) >= 2:
                email = parts[0].lower()
                kind = parts[1]
                zlv_users[email] = {'kind': kind}

    # Load Portail DF users
    portail_users = {}
    with open(users_jsonl_path, 'r') as f:
        for line in f:
            user = json.loads(line)
            email = user.get('email', '').lower()
            portail_users[email] = user

    # Analyze by kind
    results = {
        'gestionnaire': {'total': 0, 'fr_entiere': 0, 'epci': 0, 'dept': 0, 'communes': 0, 'vide': 0, 'no_groupe': 0},
        'prestataire': {'total': 0, 'fr_entiere': 0, 'epci': 0, 'dept': 0, 'communes': 0, 'vide': 0, 'no_groupe': 0},
    }

    for email, zlv_data in zlv_users.items():
        kind = zlv_data['kind']
        if kind not in results:
            continue

        results[kind]['total'] += 1

        if email not in portail_users:
            continue

        p_user = portail_users[email]
        groupe_id = p_user.get('groupe')

        if not groupe_id:
            results[kind]['no_groupe'] += 1
            continue

        if groupe_id not in groups:
            results[kind]['no_groupe'] += 1
            continue

        group = groups[groupe_id]
        perim_id = group.get('perimetre')

        if not perim_id or perim_id not in perimeters:
            results[kind]['vide'] += 1
            continue

        perim = perimeters[perim_id]

        # Classify perimeter type
        if perim.get('fr_entiere'):
            results[kind]['fr_entiere'] += 1
        elif perim.get('epci') and len(perim['epci']) > 0 and not perim.get('comm'):
            results[kind]['epci'] += 1
        elif perim.get('dep') and len(perim['dep']) > 0:
            results[kind]['dept'] += 1
        elif perim.get('comm') and len(perim['comm']) > 0:
            results[kind]['communes'] += 1
        else:
            results[kind]['vide'] += 1

    # Print results
    print()
    print(f"{'Kind':<20} {'Total':>8} {'France':>8} {'EPCI':>8} {'Dept':>8} {'Communes':>10} {'Vide':>8} {'No grp':>8}")
    print("-" * 90)

    for kind in ['gestionnaire', 'prestataire']:
        r = results[kind]
        print(f"{kind:<20} {r['total']:>8} {r['fr_entiere']:>8} {r['epci']:>8} {r['dept']:>8} {r['communes']:>10} {r['vide']:>8} {r['no_groupe']:>8}")

    # Percentages
    print()
    print("POURCENTAGES:")
    print(f"{'Kind':<20} {'France':>10} {'EPCI':>10} {'Dept':>10} {'Communes':>12} {'Vide':>10}")
    print("-" * 75)

    for kind in ['gestionnaire', 'prestataire']:
        r = results[kind]
        total = r['total'] - r['no_groupe']
        if total > 0:
            pct_fr = round(100 * r['fr_entiere'] / total, 1)
            pct_epci = round(100 * r['epci'] / total, 1)
            pct_dept = round(100 * r['dept'] / total, 1)
            pct_comm = round(100 * r['communes'] / total, 1)
            pct_vide = round(100 * r['vide'] / total, 1)
            print(f"{kind:<20} {pct_fr:>9}% {pct_epci:>9}% {pct_dept:>9}% {pct_comm:>11}% {pct_vide:>9}%")

    # Summary
    print()
    print("=" * 80)
    print("RÉSUMÉ - PÉRIMÈTRES RESTREINTS (Communes uniquement)")
    print("=" * 80)

    total_gestionnaire = results['gestionnaire']['total'] - results['gestionnaire']['no_groupe']
    total_prestataire = results['prestataire']['total'] - results['prestataire']['no_groupe']

    if total_gestionnaire > 0:
        pct = round(100 * results['gestionnaire']['communes'] / total_gestionnaire, 1)
        print(f"Gestionnaires avec périmètre restreint: {results['gestionnaire']['communes']} / {total_gestionnaire} ({pct}%)")

    if total_prestataire > 0:
        pct = round(100 * results['prestataire']['communes'] / total_prestataire, 1)
        print(f"Prestataires avec périmètre restreint: {results['prestataire']['communes']} / {total_prestataire} ({pct}%)")

def main():
    parser = argparse.ArgumentParser(description='Fetch groups and perimeters from Portail DF API')
    parser.add_argument('--users-jsonl', default='01-cerema-scraper/users.jsonl',
                        help='Path to users.jsonl file')
    parser.add_argument('--zlv-emails', default='/tmp/zlv_users.csv',
                        help='Path to ZLV users CSV file')
    parser.add_argument('--groups-output', default='groupes.jsonl',
                        help='Output file for groups')
    parser.add_argument('--perimeters-output', default='perimetres.jsonl',
                        help='Output file for perimeters')
    parser.add_argument('--analyze-only', action='store_true',
                        help='Only analyze existing data, do not fetch')

    args = parser.parse_args()

    print("=" * 80)
    print("🔍 FETCH GROUPS & PERIMETERS FROM PORTAIL DF")
    print("=" * 80)
    print(f"Timestamp: {datetime.now().isoformat()}")

    # Check for existing data files for analysis-only mode
    if args.analyze_only:
        if not Path(args.groups_output).exists() or not Path(args.perimeters_output).exists():
            print("❌ Missing data files for analysis. Run without --analyze-only first.")
            sys.exit(1)

        # Load existing data
        groups = {}
        with open(args.groups_output, 'r') as f:
            for line in f:
                g = json.loads(line)
                groups[g['id_groupe']] = g

        perimeters = {}
        with open(args.perimeters_output, 'r') as f:
            for line in f:
                p = json.loads(line)
                perimeters[p['perimetre_id']] = p

        analyze_perimeters(args.zlv_emails, args.users_jsonl, groups, perimeters)
        return

    # Get credentials
    username = os.environ.get('CEREMA_USERNAME')
    password = os.environ.get('CEREMA_PASSWORD')

    if not username or not password:
        print("❌ CEREMA_USERNAME and CEREMA_PASSWORD environment variables required")
        sys.exit(1)

    # Authenticate
    token = authenticate(username, password)
    if not token:
        sys.exit(1)

    # Get group IDs for ZLV users
    group_ids = get_zlv_group_ids(args.users_jsonl, args.zlv_emails)

    # Fetch groups
    groups, perimeter_ids = fetch_all_groups(token, group_ids, args.groups_output)

    # Fetch perimeters
    perimeters = fetch_all_perimeters(token, perimeter_ids, args.perimeters_output)

    # Analyze
    analyze_perimeters(args.zlv_emails, args.users_jsonl, groups, perimeters)

    print("\n" + "=" * 80)
    print("✅ DONE")
    print("=" * 80)
    print(f"Output files:")
    print(f"  - {args.groups_output}")
    print(f"  - {args.perimeters_output}")

if __name__ == '__main__':
    main()
