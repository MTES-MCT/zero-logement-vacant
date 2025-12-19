"""
Script to process French state entities (administration centrale, établissements publics, services déconcentrés).
Creates a standardized dataset with administrative metadata and geographic perimeters.
"""

import pandas as pd
import requests
import time
from typing import List, Dict, Optional, Tuple
import numpy as np
import requests_cache



# Install cache to avoid repeated API calls
requests_cache.install_cache('api_entreprise_cache', expire_after=36000000)

# Data source for communes mapping (to build geo perimeters)
COLLECTIVITIES_FILE = "collectivities_processed.csv"

MILLESIME = "2025"

# Entity definitions
ADMINISTRATION_CENTRALE = [
    {
        'name_zlv': 'DGALN',
        'name_source': 'DIRECTION GENERALE DE L\'AMENAGEMENT DU LOGEMENT ET DE LA NATURE',
        'search_query': 'DIRECTION GENERALE DE L\'AMENAGEMENT DU LOGEMENT ET DE LA NATURE',
        'nature_juridique': '7120'
    },
    {
        'name_zlv': 'DGFIP',
        'name_source': 'DIRECTION GENERALE DES FINANCES PUBLIQUES',
        'search_query': 'DIRECTION GENERALE DES FINANCES PUBLIQUES',
        'nature_juridique': '7120'
    },
    {
        'name_zlv': 'DGT',
        'name_source': 'DIRECTION GENERALE DU TRESOR',
        'search_query': 'DIRECTION GENERALE DU TRESOR',
        'nature_juridique': '7120'
    },
    {
        'name_zlv': 'SGPE',
        'name_source': 'SECRETARIAT GENERAL A LA PLANIFICATION ECOLOGIQUE',
        'search_query': 'SECRETARIAT GENERAL A LA PLANIFICATION ECOLOGIQUE',
        'nature_juridique': '7120'
    },
    {
        'name_zlv': 'IGEDD',
        'name_source': 'INSPECTION GENERALE DE L\'ENVIRONNEMENT ET DU DEVELOPPEMENT DURABLE',
        'search_query': 'INSPECTION GENERALE DE L\'ENVIRONNEMENT ET DU DEVELOPPEMENT DURABLE',
        'nature_juridique': '7120'
    },
    {
        'name_zlv': 'COUR DES COMPTES',
        'name_source': 'COUR DES COMPTES',
        'search_query': '110000288',
        'nature_juridique': '7120'
    },
    {
        'name_zlv': 'INSEE',
        'name_source': 'INSTITUT NATIONAL DE LA STATISTIQUE ET DES ETUDES ECONOMIQUES',
        'search_query': 'INSTITUT NATIONAL DE LA STATISTIQUE ET DES ETUDES ECONOMIQUES',
        'nature_juridique': '7120'
    }
]

ETABLISSEMENT_PUBLIC = [
    {
        'name_zlv': 'ANAH',
        'name_source': 'AGENCE NATIONALE DE L\'HABITAT',
        'search_query': 'AGENCE NATIONALE DE L\'HABITAT',
        'nature_juridique': '7389'
    },
    {
        'name_zlv': 'CEREMA',
        'name_source': 'CENTRE D\'ETUDES ET D\'EXPERTISE SUR LES RISQUES L\'ENVIRONNEMENT LA MOBILITE ET L\'AMENAGEMENT',
        'search_query': 'CEREMA',
        'nature_juridique': '7389'
    },
    {
        'name_zlv': 'ANCT',
        'name_source': 'AGENCE NATIONALE DE LA COHESION DES TERRITOIRES',
        'search_query': 'AGENCE NATIONALE DE LA COHESION DES TERRITOIRES',
        'nature_juridique': '7389'
    },
    {
        'name_zlv': 'CSTB',
        'name_source': 'CTRE SCIENTIFIQUE TECHNIQUE DU BATIMENT',
        'search_query': 'CSTB',
        'nature_juridique': '4110'
    },
    {
        'name_zlv': 'ADEME',
        'name_source': 'AGENCE DE L ENVIRONNEMENT ET DE LA MAITRISE DE L ENERGIE',
        'search_query': 'AGENCE DE L ENVIRONNEMENT ET DE LA MAITRISE DE L ENERGIE',
        'nature_juridique': '4110'
    },
    {
        'name_zlv': 'CDC',
        'name_source': 'CAISSE DES DEPOTS ET CONSIGNATIONS',
        'search_query': 'CAISSE DES DEPOTS ET CONSIGNATIONS',
        'nature_juridique': '7490'
    }
]

# Service types for regional and departmental services
REGIONAL_SERVICE_TYPES = ['DREAL', 'DREETS', 'DRFIP', 'DRIHL', 'DRIEAT', 'DRIEETS', 'DEAL', 'PREFECTURE']
DEPARTMENTAL_SERVICE_TYPES = ['DDT', 'DDTM', 'DDETS', 'DDETSPP', 'DDFIP', 'PREFECTURE', 'DID']

# Collectivités Territoriales (ACT) - nature juridique 7229
# Entities to exclude from nature juridique 7229
EXCLUDED_COLLECTIVITES = ['VILLE DE PARIS', 'METROPOLE DE LYON', "AGENCE D'ATTRACTIVITE PONT L'EVEQUE INTERCOM - 2APLI"]

# Mapping for Name-zlv (proper capitalization)
COLLECTIVITES_NAME_MAPPING = {
    'COLLECTIVITE DE CORSE': 'Collectivité de Corse',
    'COLLECTIVITE TERRITORIALE DE MARTINIQUE': 'Collectivité Territoriale de Martinique',
    'DEPARTEMENT DE MAYOTTE': 'Département de Mayotte',
    'COLLECTIVITE TERRITORIALE DE GUYANE': 'Collectivité Territoriale de Guyane',
    'TERRITOIRE DE NOUVELLE-CALEDONIE': 'Territoire de Nouvelle-Calédonie',
    'PROVINCE DU NORD': 'Province du Nord',
    'PROVINCE SUD': 'Province Sud',
    'PROVINCE DES ILES': 'Province des Iles',
    'TERRITOIRE DES TERRES AUSTRALES ET ANTARCTIQUES FRANCAISES': 'TAAF',
    'CONSEIL TERRITORIAL ST BARTHELEMY': 'Conseil territorial St Barthelemy'
}


class EntityProcessor:
    """Process and standardize state entities data."""
    
    def __init__(self, collectivities_file: str = COLLECTIVITIES_FILE):
        """Initialize the processor and load collectivities data."""
        print("Loading collectivities data for geographic mappings...")
        self.df_collectivities = pd.read_csv(collectivities_file)
        
        # Parse the Geo_Perimeter column (it's stored as string representation of list)
        self.df_collectivities['Geo_Perimeter'] = self.df_collectivities['Geo_Perimeter'].apply(self._parse_list_string)
        self.df_collectivities['Dep_Code'] = self.df_collectivities['Dep_Code'].apply(self._parse_list_string)
        self.df_collectivities['Dep_Name'] = self.df_collectivities['Dep_Name'].apply(self._parse_list_string)
        
        # Build geographic lookups
        self._build_geo_lookups()
        print("Data loaded successfully!")
    
    def _parse_list_string(self, value):
        """Parse string representation of list to actual list."""
        if pd.isna(value):
            return []
        if isinstance(value, list):
            return value
        if isinstance(value, str):
            # Remove brackets and quotes, split by comma
            value = value.strip('[]').replace("'", "").replace('"', '')
            if not value:
                return []
            return [item.strip() for item in value.split(',')]
        return []
    
    def _normalize_geo_code(self, code):
        """
        Normalize geographic codes by removing decimals and leading zeros.
        Keeps alphanumeric codes like 2A, 2B intact.
        """
        if not code:
            return None
        code = str(code).strip()
        
        # Remove decimal point if present
        if '.' in code:
            try:
                float_val = float(code)
                if float_val.is_integer():
                    code = str(int(float_val))
                else:
                    # Non-integer float - convert to int (truncate)
                    code = str(int(float_val))
            except (ValueError, OverflowError):
                # If conversion fails, just remove the decimal point
                code = code.split('.')[0]
        
        # For purely numeric codes, remove leading zeros
        if code.isdigit():
            return str(int(code))
        
        # For alphanumeric codes (like 2A, 2B), keep as-is
        return code
    
    def _build_geo_lookups(self):
        """Build lookup dictionaries for geographic data."""
        # Get all communes, departments, regions
        regions = self.df_collectivities[self.df_collectivities['Kind-admin'] == 'REG'].copy()
        departments = self.df_collectivities[self.df_collectivities['Kind-admin'] == 'DEP'].copy()
        tom_departments = self.df_collectivities[self.df_collectivities['Kind-admin'] == 'TOM'].copy()
        
        # All communes in France
        all_communes = []
        for _, region in regions.iterrows():
            all_communes.extend(region['Geo_Perimeter'])
        self.all_communes = list(set(all_communes))
        
        # All departments
        self.all_departments = []
        self.all_department_names = []
        for _, dept in departments.iterrows():
            dep_codes = dept['Dep_Code'] if isinstance(dept['Dep_Code'], list) else [dept['Dep_Code']]
            dep_names = dept['Dep_Name'] if isinstance(dept['Dep_Name'], list) else [dept['Dep_Name']]
            self.all_departments.extend(dep_codes)
            self.all_department_names.extend(dep_names)
        
        # All regions
        self.all_regions = regions['Reg_Code'].tolist()
        self.all_region_names = regions['Reg_Name'].tolist()
        
        # Create lookups by region code (normalized - without leading zeros)
        self.region_to_data = {}
        for _, region in regions.iterrows():
            reg_code = self._normalize_geo_code(region['Reg_Code'])
            if reg_code:
                self.region_to_data[reg_code] = {
                    'communes': region['Geo_Perimeter'],
                    'dep_codes': region['Dep_Code'],
                    'dep_names': region['Dep_Name'],
                    'reg_name': region['Reg_Name']
                }
        
        # Create lookups by department code (normalized - handle 2A, 2B for Corsica)
        self.dep_to_data = {}
        for _, dept in departments.iterrows():
            dep_code_list = dept['Dep_Code'] if isinstance(dept['Dep_Code'], list) else [dept['Dep_Code']]
            dep_code = self._normalize_geo_code(dep_code_list[0]) if dep_code_list else None
            if dep_code:
                self.dep_to_data[dep_code] = {
                    'communes': dept['Geo_Perimeter'],
                    'dep_name': dept['Dep_Name'][0] if isinstance(dept['Dep_Name'], list) else dept['Dep_Name'],
                    'reg_code': self._normalize_geo_code(dept['Reg_Code']),
                    'reg_name': dept['Reg_Name']
                }
        
        # Add TOM departments to dep_to_data
        for _, tom_dept in tom_departments.iterrows():
            dep_code_list = tom_dept['Dep_Code'] if isinstance(tom_dept['Dep_Code'], list) else [tom_dept['Dep_Code']]
            dep_code = self._normalize_geo_code(dep_code_list[0]) if dep_code_list else None
            if dep_code:
                self.dep_to_data[dep_code] = {
                    'communes': tom_dept['Geo_Perimeter'],
                    'dep_name': tom_dept['Dep_Name'][0] if isinstance(tom_dept['Dep_Name'], list) else tom_dept['Dep_Name'],
                    'reg_code': None,  # TOM departments don't have regions
                    'reg_name': None
                }
    
    def _call_api_entreprise(self, nature_juridique: str, query: str, page: int = 1) -> Optional[Dict]:
        """Call the API Entreprise to search for entities."""
        time.sleep(0.5)  # Rate limiting
        url = f"https://recherche-entreprises.api.gouv.fr/search?nature_juridique={nature_juridique}&q={query}&per_page=25&page={page}"
        try:
            response = requests.get(url, timeout=10)
            if response.status_code == 200:
                return response.json()
            else:
                print(f"  ⚠️  API error {response.status_code} for query: {query}")
                return None
        except Exception as e:
            print(f"  ⚠️  Exception calling API: {e}")
            return None
    
    def _get_full_results_with_pagination(self, nature_juridique: str, query: str) -> List[Dict]:
        """Get all results from API with pagination."""
        page = 1
        all_results = []
        
        while True:
            result = self._call_api_entreprise(nature_juridique, query, page)
            if result is None or 'results' not in result:
                break
            
            results = result['results']
            if not results:
                break
            
            all_results.extend(results)
            
            # Check if there are more pages
            if result.get('total_pages', 1) <= page:
                break
            
            page += 1
        
        return all_results
    
    def _extract_entity_info(self, api_result: Dict) -> Tuple[Optional[str], Optional[str], Optional[str]]:
        """Extract SIREN, SIRET, and commune code from API result."""
        siren = api_result.get('siren')
        siret = api_result.get('siege', {}).get('siret')
        
        # Get commune code from siege address
        commune_code = None
        siege = api_result.get('siege', {})
        if siege:
            commune_code = siege.get('code_commune')
        
        return siren, siret, commune_code
    
    def _get_dep_reg_from_commune(self, commune_code: str) -> Tuple[Optional[str], Optional[str], Optional[str], Optional[str]]:
        """Get department and region codes/names from commune code."""
        # Search in collectivities for this commune
        for _, row in self.df_collectivities[self.df_collectivities['Kind-admin'] == 'COM'].iterrows():
            if commune_code in row['Geo_Perimeter']:
                dep_code = row['Dep_Code'][0] if isinstance(row['Dep_Code'], list) else row['Dep_Code']
                dep_name = row['Dep_Name'][0] if isinstance(row['Dep_Name'], list) else row['Dep_Name']
                reg_code = row['Reg_Code']
                reg_name = row['Reg_Name']
                return dep_code, dep_name, reg_code, reg_name
        
        return None, None, None, None
    
    def _create_base_row(self) -> Dict:
        """Create a base row with all required columns."""
        return {
            'Name-zlv': None,
            'Name-source': None,
            'Kind-admin_meta': None,
            'Kind-admin': None,
            'Kind-admin_label': None,
            'Siren': None,
            'Siret': None,
            'Layer-geo_label': None,
            'Geo_Perimeter': None,
            'Dep_Code': None,
            'Dep_Name': None,
            'Reg_Code': None,
            'Reg_Name': None,
            'Millesime': MILLESIME
        }
    
    def process_administration_centrale(self) -> List[Dict]:
        """Process administration centrale entities."""
        print("Processing Administration Centrale...")
        results = []
        
        for entity_def in ADMINISTRATION_CENTRALE:
            print(f"  Processing {entity_def['name_zlv']}...")
            
            # Call API
            api_results = self._get_full_results_with_pagination(
                entity_def['nature_juridique'],
                entity_def['search_query']
            )
            
            if not api_results:
                print(f"  ⚠️  No results found for {entity_def['name_zlv']}")
                continue
            
            # Take the first/most relevant result
            api_result = api_results[0]
            siren, siret, commune_code = self._extract_entity_info(api_result)
            
            # Get department and region from commune
            dep_code, dep_name, reg_code, reg_name = None, None, None, None
            if commune_code:
                dep_code, dep_name, reg_code, reg_name = self._get_dep_reg_from_commune(commune_code)
            
            # National scope - all communes, departments, regions
            data = self._create_base_row()
            data.update({
                'Name-zlv': entity_def['name_zlv'],
                'Name-source': api_result.get('nom_complet', entity_def['name_source']),
                'Kind-admin_meta': 'Services de l\'Etat',
                'Kind-admin': 'ADMIN',
                'Kind-admin_label': 'Administration Centrale',
                'Siren': siren,
                'Siret': siret,
                'Layer-geo_label': 'National',
                'Geo_Perimeter': self.all_communes,
                'Dep_Code': self.all_departments,
                'Dep_Name': self.all_department_names,
                'Reg_Code': self.all_regions,
                'Reg_Name': self.all_region_names
            })
            results.append(data)
            print(f"  ✓ {entity_def['name_zlv']} processed (SIREN: {siren})")
        
        print(f"Processed {len(results)} administration centrale entities")
        return results
    
    def process_etablissement_public(self) -> List[Dict]:
        """Process établissement public entities."""
        print("Processing Établissement Public...")
        results = []
        
        for entity_def in ETABLISSEMENT_PUBLIC:
            print(f"  Processing {entity_def['name_zlv']}...")
            
            # Call API
            api_results = self._get_full_results_with_pagination(
                entity_def['nature_juridique'],
                entity_def['search_query']
            )
            
            if not api_results:
                print(f"  ⚠️  No results found for {entity_def['name_zlv']}")
                continue
            
            # Take the first/most relevant result
            api_result = api_results[0]
            siren, siret, commune_code = self._extract_entity_info(api_result)
            
            # Get department and region from commune
            dep_code, dep_name, reg_code, reg_name = None, None, None, None
            if commune_code:
                dep_code, dep_name, reg_code, reg_name = self._get_dep_reg_from_commune(commune_code)
            
            # National scope - all communes, departments, regions
            data = self._create_base_row()
            data.update({
                'Name-zlv': entity_def['name_zlv'],
                'Name-source': api_result.get('nom_complet', entity_def['name_source']),
                'Kind-admin_meta': 'Établissement public',
                'Kind-admin': 'EPIC-EPA',
                'Kind-admin_label': 'Établissement Public',
                'Siren': siren,
                'Siret': siret,
                'Layer-geo_label': 'National',
                'Geo_Perimeter': self.all_communes,
                'Dep_Code': self.all_departments,
                'Dep_Name': self.all_department_names,
                'Reg_Code': self.all_regions,
                'Reg_Name': self.all_region_names
            })
            results.append(data)
            print(f"  ✓ {entity_def['name_zlv']} processed (SIREN: {siren})")
        
        print(f"Processed {len(results)} établissement public entities")
        return results
    
    def process_regional_services(self) -> List[Dict]:
        """Process regional services (DREAL, DREETS, etc.)."""
        print("Processing Regional Services...")
        results = []
        
        # Query each service type separately
        for service_type in REGIONAL_SERVICE_TYPES:
            print(f"  Querying {service_type}...")
            api_results = self._get_full_results_with_pagination('7171', service_type)
            
            if not api_results:
                print(f"    No {service_type} found")
                continue
            
            print(f"    Found {len(api_results)} {service_type} entities")
            
            # Process each result
            for api_result in api_results:
                nom_complet = api_result.get('nom_complet', '').upper()
                
                # Verify this is actually the service type we want
                if service_type not in nom_complet:
                    continue
                
                # Exclude police-related entities
                if 'POLICE' in nom_complet:
                    print(f"    ⊗ Skipping police entity: {nom_complet}")
                    continue
                
                # Extract info
                siren = api_result.get('siren')
                siret = api_result.get('siege', {}).get('siret')
                sigle = api_result.get('sigle')
                
                # Handle missing sigle - use service type as fallback
                if not sigle or sigle.strip() == '':
                    sigle = service_type
                
                # Get region from siege
                siege = api_result.get('siege', {})
                reg_code_raw = siege.get('region')
                
                if not reg_code_raw:
                    print(f"    ⚠️  No region found for {nom_complet}")
                    continue
                
                # Normalize region code (remove leading zeros)
                reg_code = self._normalize_geo_code(reg_code_raw)
                
                # Look up region data in collectivities
                if reg_code not in self.region_to_data:
                    print(f"    ⚠️  Region {reg_code} (raw: {reg_code_raw}) not found in collectivities data")
                    continue
                
                region_data = self.region_to_data[reg_code]
                geo_perimeter = region_data['communes']
                dep_codes = region_data['dep_codes']
                dep_names = region_data['dep_names']
                reg_name = region_data['reg_name']
                
                # Create name-zlv with region name
                # Special handling for PREFECTURE
                if service_type == 'PREFECTURE':
                    name_zlv = f"Préfecture {reg_name}"
                else:
                    name_zlv = f"{sigle} {reg_name}"
                
                data = self._create_base_row()
                data.update({
                    'Name-zlv': name_zlv,
                    'Name-source': api_result.get('nom_complet', ''),
                    'Kind-admin_meta': 'Services de l\'Etat',
                    'Kind-admin': sigle,
                    'Kind-admin_label': 'Service déconcentré de l\'État à compétence (inter) régionale',
                    'Siren': siren,
                    'Siret': siret,
                    'Layer-geo_label': 'Région',
                    'Geo_Perimeter': geo_perimeter,
                    'Dep_Code': dep_codes,
                    'Dep_Name': dep_names,
                    'Reg_Code': [reg_code],
                    'Reg_Name': [reg_name]
                })
                results.append(data)
                print(f"    ✓ {name_zlv} processed (SIREN: {siren})")
        
        print(f"Processed {len(results)} regional services")
        return results
    
    def process_departmental_services(self) -> List[Dict]:
        """Process departmental services (DDT, DDTM, etc.)."""
        print("Processing Departmental Services...")
        results = []
        
        # Query each service type separately
        for service_type in DEPARTMENTAL_SERVICE_TYPES:
            print(f"  Querying {service_type}...")
            api_results = self._get_full_results_with_pagination('7172', service_type)
            
            if not api_results:
                print(f"    No {service_type} found")
                continue
            
            print(f"    Found {len(api_results)} {service_type} entities")
            
            # Process each result
            for api_result in api_results:
                nom_complet = api_result.get('nom_complet', '').upper()
                
                # Verify this is actually the service type we want
                if service_type not in nom_complet:
                    continue
                
                # Exclude police-related entities
                if 'POLICE' in nom_complet:
                    print(f"    ⊗ Skipping police entity: {nom_complet}")
                    continue
                
                # Extract info
                siren = api_result.get('siren')
                siret = api_result.get('siege', {}).get('siret')
                sigle = api_result.get('sigle')
                
                # Handle missing sigle - use service type as fallback
                if not sigle or sigle.strip() == '':
                    sigle = service_type
                
                # Get department from siege
                siege = api_result.get('siege', {})
                dep_code_raw = siege.get('departement')
                
                if not dep_code_raw:
                    print(f"    ⚠️  No department found for {nom_complet}")
                    continue
                
                # Normalize department code (remove leading zeros, keep 2A/2B)
                dep_code = self._normalize_geo_code(dep_code_raw)
                
                # Look up department data in collectivities
                if dep_code not in self.dep_to_data:
                    print(f"    ⚠️  Department {dep_code} (raw: {dep_code_raw}) not found in collectivities data")
                    continue
                
                dept_data = self.dep_to_data[dep_code]
                geo_perimeter = dept_data['communes']
                dep_name = dept_data['dep_name']
                reg_code = dept_data['reg_code']
                reg_name = dept_data['reg_name']
                
                # Create name-zlv with department name
                # Special handling for PREFECTURE
                if service_type == 'PREFECTURE':
                    name_zlv = f"Préfecture {dep_name}"
                else:
                    name_zlv = f"{sigle} {dep_name}"
                
                data = self._create_base_row()
                data.update({
                    'Name-zlv': name_zlv,
                    'Name-source': api_result.get('nom_complet', ''),
                    'Kind-admin_meta': 'Services de l\'Etat',
                    'Kind-admin': sigle,
                    'Kind-admin_label': 'Service déconcentré de l\'État à compétence (inter) départementale',
                    'Siren': siren,
                    'Siret': siret,
                    'Layer-geo_label': 'Département',
                    'Geo_Perimeter': geo_perimeter,
                    'Dep_Code': [dep_code],
                    'Dep_Name': [dep_name],
                    'Reg_Code': [reg_code] if reg_code else [],
                    'Reg_Name': [reg_name] if reg_name else []
                })
                results.append(data)
                print(f"    ✓ {name_zlv} processed (SIREN: {siren})")
        
        print(f"Processed {len(results)} departmental services")
        return results
    
    def process_collectivites_territoriales(self) -> List[Dict]:
        """Process special territorial collectivities (ACT) - nature juridique 7229."""
        print("Processing Collectivités Territoriales...")
        results = []
        
        # Query all entities with nature juridique 7229
        print("  Querying nature juridique 7229...")
        api_results = self._get_full_results_with_pagination('7229', '')
        
        if not api_results:
            print("  ⚠️  No results found")
            return results
        
        print(f"  Found {len(api_results)} entities with nature juridique 7229")
        
        # Process each result
        for api_result in api_results:
            nom_raison_sociale = api_result.get('nom_raison_sociale', '').upper()
            
            # Skip excluded entities
            if nom_raison_sociale in EXCLUDED_COLLECTIVITES:
                print(f"    ⊗ Skipping excluded entity: {nom_raison_sociale}")
                continue
            
            # Skip if not in our mapping
            if nom_raison_sociale not in COLLECTIVITES_NAME_MAPPING:
                print(f"    ⊗ Skipping unmapped entity: {nom_raison_sociale}")
                continue
            
            # Get mapped name
            name_zlv = COLLECTIVITES_NAME_MAPPING[nom_raison_sociale]
            
            # Extract SIREN, SIRET
            siren = api_result.get('siren')
            siret = api_result.get('siege', {}).get('siret')
            
            # Get region and department from siege
            siege = api_result.get('siege', {})
            reg_code_raw = siege.get('region')
            dep_code_raw = siege.get('departement')
            
            # Determine geographic scope based on the entity
            geo_perimeter = []
            dep_codes = []
            dep_names = []
            reg_code = None
            reg_name = None
            
            # Try to match with region or department data
            if reg_code_raw:
                reg_code = self._normalize_geo_code(reg_code_raw)
                
                # First try: Match by region code
                if reg_code in self.region_to_data:
                    region_data = self.region_to_data[reg_code]
                    geo_perimeter = region_data['communes']
                    dep_codes = region_data['dep_codes']
                    dep_names = region_data['dep_names']
                    reg_name = region_data['reg_name']
                    print(f"    ✓ Found region data for {name_zlv} (region: {reg_code})")
                # Second try: Some regions are stored as a single department (DOM/TOM)
                # Try to find departments that belong to this region
                elif not geo_perimeter:
                    # Look through all departments to find those in this region
                    matching_depts = self.df_collectivities[
                        (self.df_collectivities['Kind-admin'].isin(['DEP', 'TOM'])) &
                        (self.df_collectivities['Reg_Code'] == reg_code_raw)
                    ]
                    
                    if len(matching_depts) > 0:
                        # Aggregate all communes from matching departments
                        all_communes = []
                        all_dep_codes = []
                        all_dep_names = []
                        
                        for _, dept_row in matching_depts.iterrows():
                            all_communes.extend(dept_row['Geo_Perimeter'])
                            dept_codes = dept_row['Dep_Code'] if isinstance(dept_row['Dep_Code'], list) else [dept_row['Dep_Code']]
                            dept_names = dept_row['Dep_Name'] if isinstance(dept_row['Dep_Name'], list) else [dept_row['Dep_Name']]
                            all_dep_codes.extend(dept_codes)
                            all_dep_names.extend(dept_names)
                        
                        geo_perimeter = list(set(all_communes))
                        dep_codes = list(set(all_dep_codes))
                        dep_names = list(set(all_dep_names))
                        reg_name = matching_depts.iloc[0]['Reg_Name'] if 'Reg_Name' in matching_depts.columns else None
                        print(f"    ✓ Found {len(matching_depts)} department(s) for {name_zlv} in region {reg_code}")
                    else:
                        print(f"    ⚠️  Region {reg_code} not found in collectivities data for {name_zlv}")
                else:
                    print(f"    ⚠️  Region {reg_code} not found in collectivities data for {name_zlv}")
            elif dep_code_raw:
                dep_code = self._normalize_geo_code(dep_code_raw)
                if dep_code in self.dep_to_data:
                    dept_data = self.dep_to_data[dep_code]
                    geo_perimeter = dept_data['communes']
                    dep_codes = [dep_code]
                    dep_names = [dept_data['dep_name']]
                    reg_code = dept_data['reg_code']
                    reg_name = dept_data['reg_name']
                    print(f"    ✓ Found department data for {name_zlv} (department: {dep_code})")
                else:
                    print(f"    ⚠️  Department {dep_code} not found in collectivities data for {name_zlv}")
            
            # Special handling for overseas territories without standard region codes
            # If no geographic data found, use empty lists (these territories may not be in standard COG)
            if not geo_perimeter:
                print(f"    ℹ️  No geographic perimeter data available for {name_zlv} (overseas territory)")
            
            # Create the data row
            data = self._create_base_row()
            data.update({
                'Name-zlv': name_zlv,
                'Name-source': api_result.get('nom_raison_sociale', ''),
                'Kind-admin_meta': 'Autre Collectivité Territoriale',
                'Kind-admin': 'ACT',
                'Kind-admin_label': 'Autre Collectivité Territoriale',
                'Siren': siren,
                'Siret': siret,
                'Layer-geo_label': 'Hybride',
                'Geo_Perimeter': geo_perimeter,
                'Dep_Code': dep_codes,
                'Dep_Name': dep_names,
                'Reg_Code': [reg_code] if reg_code else [],
                'Reg_Name': [reg_name] if reg_name else []
            })
            results.append(data)
            print(f"    ✓ {name_zlv} processed (SIREN: {siren})")
        
        print(f"Processed {len(results)} collectivités territoriales")
        return results
    
    def process_all(self) -> pd.DataFrame:
        """Process all entities and return a combined DataFrame."""
        print("\n=== Starting entity processing ===\n")
        
        all_results = []
        
        # Process each type
        all_results.extend(self.process_administration_centrale())
        all_results.extend(self.process_etablissement_public())
        all_results.extend(self.process_regional_services())
        all_results.extend(self.process_departmental_services())
        all_results.extend(self.process_collectivites_territoriales())
        
        df = pd.DataFrame(all_results)
        
        print(f"\n=== Processing complete! ===")
        print(f"Total entities: {len(df)}")
        
        return df


def main():
    """Main execution function."""
    # Initialize processor
    processor = EntityProcessor()
    
    # Process all data
    df_entities = processor.process_all()
    
    # Save to CSV
    output_file = 'entities_processed.csv'
    df_entities.to_csv(output_file, index=False)
    print(f"\nData saved to {output_file}")
    
    # Save to Excel with better formatting
    output_excel = 'entities_processed.xlsx'
    df_entities.to_excel(output_excel, index=False)
    print(f"Data saved to {output_excel}")
    
    # Display sample
    if len(df_entities) > 0:
        print("\n=== Sample output (first 5 rows) ===")
        print(df_entities.head().to_string())
    
    return df_entities


if __name__ == '__main__':
    df = main()
