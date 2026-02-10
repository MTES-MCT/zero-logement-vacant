#!/usr/bin/env python3
"""
Script to check if multiple establishments share the same SIREN but have different SIRET
"""

import csv
from collections import defaultdict
from pathlib import Path

csv.field_size_limit(10 * 1024 * 1024)

def check_siren_siret_mapping():
    script_dir = Path(__file__).parent
    files = [
        {'path': script_dir / 'entities_processed.csv', 'name': 'entities'},
        {'path': script_dir / 'collectivities_processed.csv', 'name': 'collectivities'}
    ]
    
    # Map: SIREN -> List of (SIRET, name)
    siren_to_sirets = defaultdict(list)
    
    print('=' * 80)
    print('SIREN → Multiple SIRET Analysis')
    print('=' * 80)
    print()
    
    # Load data
    for file in files:
        if not file['path'].exists():
            continue
            
        with open(file['path'], 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                siren = row.get('Siren', '').strip()
                siret = row.get('Siret', '').strip()
                name = row.get('Name-zlv') or row.get('Name-source', '')
                
                if siren and siret:  # Only count non-empty
                    siren_to_sirets[siren].append({
                        'siret': siret,
                        'name': name,
                        'kind': row.get('Kind-admin', ''),
                        'file': file['name']
                    })
    
    # Find SIREN with multiple SIRET
    siren_with_multiple = {
        siren: establishments 
        for siren, establishments in siren_to_sirets.items() 
        if len(set(e['siret'] for e in establishments)) > 1  # Different SIRET
    }
    
    print(f"📊 Total unique SIREN: {len(siren_to_sirets)}")
    print(f"📊 SIREN with multiple different SIRET: {len(siren_with_multiple)}")
    print()
    
    if siren_with_multiple:
        print('=' * 80)
        print('SIREN avec plusieurs SIRET différents')
        print('=' * 80)
        print()
        
        # Sort by number of SIRET (descending)
        sorted_siren = sorted(
            siren_with_multiple.items(), 
            key=lambda x: len(set(e['siret'] for e in x[1])), 
            reverse=True
        )
        
        for siren, establishments in sorted_siren[:20]:  # Show top 20
            unique_sirets = set(e['siret'] for e in establishments)
            print(f"SIREN: {siren} → {len(unique_sirets)} SIRET différents")
            
            # Group by SIRET
            siret_groups = defaultdict(list)
            for e in establishments:
                siret_groups[e['siret']].append(e)
            
            for siret, entries in siret_groups.items():
                print(f"  SIRET: {siret}")
                for entry in entries:
                    print(f"    - {entry['name']} ({entry['kind']}) [{entry['file']}]")
            print()
        
        if len(sorted_siren) > 20:
            print(f"... et {len(sorted_siren) - 20} autres SIREN avec multiples SIRET")
    else:
        print('✅ Aucun SIREN avec plusieurs SIRET différents trouvé')
    
    print()
    print('=' * 80)
    print('CONCLUSION')
    print('=' * 80)
    
    if siren_with_multiple:
        print(f"⚠️  {len(siren_with_multiple)} SIREN ont plusieurs SIRET différents")
        print()
        print("💡 Interprétation:")
        print("   - Un SIREN identifie une PERSONNE MORALE (entreprise, collectivité)")
        print("   - Un même SIREN peut avoir PLUSIEURS SIRET (établissements différents)")
        print("   - Exemple: Une commune avec plusieurs services = 1 SIREN, N SIRET")
        print()
        print("❓ Question pour l'import:")
        print("   - Faut-il créer UN établissement par SIREN (regrouper)?")
        print("   - Ou PLUSIEURS établissements par SIRET (séparer)?")
    else:
        print("✅ Relation 1:1 entre SIREN et SIRET dans les données")

if __name__ == '__main__':
    check_siren_siret_mapping()
