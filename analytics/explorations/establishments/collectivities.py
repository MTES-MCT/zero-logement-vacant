"""
Script to process French territorial collectivities data.
Creates a standardized dataset with administrative metadata and geographic perimeters.
"""

import pandas as pd
import requests
from typing import List, Dict, Optional
import numpy as np
import duckdb
from tqdm import tqdm
import time
import requests_cache
import re

# Data sources
URL_COMMUNES = "https://www.data.gouv.fr/api/1/datasets/r/91a95bee-c7c8-45f9-a8aa-f14cc4697545"
URL_COMMUNES_TOM = "https://www.data.gouv.fr/api/1/datasets/r/6fcfb772-1c24-41c9-b7f8-08a26cf3f585"
URL_DEPARTEMENTS = "https://www.data.gouv.fr/api/1/datasets/r/54a8263d-6e2d-48d5-b214-aa17cc13f7a0"
URL_DEPARTMENTS_TOM = "https://www.data.gouv.fr/api/1/datasets/r/d4f01365-a3a7-41b2-9907-01a6cb42c9f2"
URL_REGIONS = "https://www.data.gouv.fr/api/1/datasets/r/2486b351-5d85-4e1a-8d12-5df082c75104"
URL_MAPPING_SIREN_INSEE = "data/mapping_siren_insee.xlsx"
EPCI_PATH = "data/EPCI.xlsx"
EPT_PATH = "data/EPT.xlsx"
PARQUET_PATH = '/Users/raphaelcourivaud/Downloads/Base Sirene SIREN SIRET.parquet'
PARQUET_GEOLOC_PATH = '/Users/raphaelcourivaud/Downloads/Geolocalisation Etablissement Sirene Statistiques.parquet'
MILLESIME = "2025"
SLEEP_TIME = 0.15

requests_cache.install_cache('cache', expire_after=36000000)


class CollectivityProcessor:
    """Process and standardize territorial collectivities data."""
    
    def __init__(self):
        """Initialize the processor and load all data sources."""
        print("Loading data sources...")
        self.df_communes = pd.read_csv(URL_COMMUNES)
        self.df_communes_tom = pd.read_csv(URL_COMMUNES_TOM)
        self.df_departements = pd.read_csv(URL_DEPARTEMENTS)
        self.df_departements_tom = pd.read_csv(URL_DEPARTMENTS_TOM)
        self.df_regions = pd.read_csv(URL_REGIONS)
        self.df_epci_main = pd.read_excel(EPCI_PATH, sheet_name='EPCI')
        self.df_epci_composition = pd.read_excel(EPCI_PATH, sheet_name='Composition')
        self.df_ept_main = pd.read_excel(EPT_PATH, sheet_name='EPT')
        self.df_ept_composition = pd.read_excel(EPT_PATH, sheet_name='Composition')
        self.df_mapping_siren_insee = pd.read_excel(URL_MAPPING_SIREN_INSEE)
        print("Data sources loaded successfully!")
        
        # Build lookup dictionaries
        self._build_lookups()
    
    def _normalize_code(self, value):
        """
        Normalize a code value to string format without decimals.
        Handles floats (1.0 -> "01"), integers, NaN, and alphanumeric codes (2A, 2B).
        Returns codes without decimal points, zero-padded to 2 digits for numeric codes.
        """
        if pd.isna(value):
            return None
        
        # Convert to string
        str_val = str(value).strip()
        
        # If it looks like a float (e.g., "1.0", "84.0")
        if '.' in str_val:
            try:
                # Convert to int to remove decimal
                float_val = float(str_val)
                if float_val.is_integer():
                    return str(int(float_val)).zfill(2)
                else:
                    # Non-integer float - should not happen, but handle it
                    return str(int(float_val)).zfill(2)
            except (ValueError, OverflowError):
                return str_val.replace('.', '').zfill(2)
        
        # For pure numeric strings, ensure zero-padding
        if str_val.isdigit():
            return str_val.zfill(2)
        
        # For alphanumeric codes (like 2A, 2B), return as-is
        return str_val
    
    def _normalize_column(self, series):
        """Normalize a pandas series of codes."""
        return series.apply(self._normalize_code)
        
    def _build_lookups(self):
        """Build lookup dictionaries for efficient data access."""
        # Normalize all code columns
        self.df_communes['COM_norm'] = self._normalize_column(self.df_communes['COM'])
        self.df_communes['DEP_norm'] = self._normalize_column(self.df_communes['DEP'])
        self.df_communes['REG_norm'] = self._normalize_column(self.df_communes['REG'])
        
        # Normalize TOM communes (using COM_COMER as the commune code and COMER as department)
        self.df_communes_tom['COM_norm'] = self._normalize_column(self.df_communes_tom['COM'])
        self.df_communes_tom['DEP_norm'] = self._normalize_column(self.df_communes_tom['DEP'])
        
        self.df_departements['DEP_norm'] = self._normalize_column(self.df_departements['DEP'])
        self.df_departements['REG_norm'] = self._normalize_column(self.df_departements['REG'])
        
        # Normalize TOM departments (using COMER as the department code)
        self.df_departements_tom['DEP_norm'] = self._normalize_column(self.df_departements_tom['COMER'])
        
        self.df_regions['REG_norm'] = self._normalize_column(self.df_regions['REG'])
        
        self.df_epci_main['EPCI_norm'] = self._normalize_column(self.df_epci_main['EPCI'])
        self.df_epci_composition['EPCI_norm'] = self._normalize_column(self.df_epci_composition['EPCI'])
        self.df_epci_composition['CODGEO_norm'] = self._normalize_column(self.df_epci_composition['CODGEO'])
        
        self.df_ept_main['EPT_norm'] = self._normalize_column(self.df_ept_main['EPT'])
        self.df_ept_composition['EPT_norm'] = self._normalize_column(self.df_ept_composition['EPT'])
        self.df_ept_composition['CODGEO_norm'] = self._normalize_column(self.df_ept_composition['CODGEO'])
        
        # Normalize INSEE to SIREN mapping
        self.df_mapping_siren_insee['code_commune_insee_norm'] = self._normalize_column(
            self.df_mapping_siren_insee['insee'].astype(str).str.zfill(5)
        )
        self.df_mapping_siren_insee['siren_norm'] = self._normalize_column(
            self.df_mapping_siren_insee['siren']
        )
        
        # INSEE code to SIREN lookup
        insee_siren_pairs = [
            (insee, siren) for insee, siren in zip(
                self.df_mapping_siren_insee['code_commune_insee_norm'],
                self.df_mapping_siren_insee['siren_norm']
            ) if insee is not None and siren is not None
        ]
        self.insee_to_siren = dict(insee_siren_pairs)
        
        # Department lookups (mainland + TOM)
        self.dep_code_to_name = dict(zip(
            self.df_departements['DEP_norm'],
            self.df_departements['LIBELLE']
        ))
        # Add TOM departments
        tom_deps = dict(zip(
            self.df_departements_tom['DEP_norm'],
            self.df_departements_tom['LIBELLE']
        ))
        self.dep_code_to_name.update(tom_deps)
        
        # Region lookups
        self.reg_code_to_name = dict(zip(
            self.df_regions['REG_norm'],
            self.df_regions['LIBELLE']
        ))
        
        # Commune to department mapping (filter out None values)
        # Mainland communes
        commune_dep_pairs = [
            (com, dep) for com, dep in zip(
                self.df_communes['COM_norm'],
                self.df_communes['DEP_norm']
            ) if com is not None and dep is not None
        ]
        # Add TOM communes
        commune_dep_pairs_tom = [
            (com, dep) for com, dep in zip(
                self.df_communes_tom['COM_norm'],
                self.df_communes_tom['DEP_norm']
            ) if com is not None and dep is not None
        ]
        commune_dep_pairs.extend(commune_dep_pairs_tom)
        self.commune_to_dep = dict(commune_dep_pairs)
        
        # Commune to region mapping (filter out None values)
        commune_reg_pairs = [
            (com, reg) for com, reg in zip(
                self.df_communes['COM_norm'],
                self.df_communes['REG_norm']
            ) if com is not None and reg is not None
        ]
        # TOM communes don't have regions, so we skip them here
        self.commune_to_reg = dict(commune_reg_pairs)
        
        # Department to region mapping
        self.dep_to_reg = dict(zip(
            self.df_departements['DEP_norm'],
            self.df_departements['REG_norm']
        ))
    
    def _get_dep_info(self, commune_codes: List[str]) -> tuple:
        """Get department codes and names from commune codes."""
        dep_codes = set()
        for code in commune_codes:
            if code in self.commune_to_dep:
                dep_codes.add(self.commune_to_dep[code])
        
        dep_codes = sorted(list(dep_codes))
        dep_names = [self.dep_code_to_name.get(code, '') for code in dep_codes]
        return dep_codes, dep_names
    
    def _get_reg_info(self, commune_codes: List[str]) -> tuple:
        """Get region code and name from commune codes."""
        reg_codes = set()
        for code in commune_codes:
            if code in self.commune_to_reg:
                reg_codes.add(self.commune_to_reg[code])
        
        # Usually should be one region, but handle multiple
        if len(reg_codes) == 1:
            reg_code = list(reg_codes)[0]
            reg_name = self.reg_code_to_name.get(reg_code, '')
            return reg_code, reg_name
        elif len(reg_codes) > 1:
            # Multiple regions - return the first one or could be improved
            reg_code = sorted(list(reg_codes))[0]
            reg_name = self.reg_code_to_name.get(reg_code, '')
            return reg_code, reg_name
        return None, None
    
    def _create_base_row(self) -> Dict:
        """Create a base row with all required columns."""
        return {
            'Name-zlv': None,
            'Name-source': None,
            'Kind-admin_meta': 'Collectivité Territoriale',
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
    
    def process_regions(self) -> List[Dict]:
        """Process all regions."""
        print("Processing regions...")
        results = []
        
        for _, row in tqdm(self.df_regions.iterrows(), total=len(self.df_regions), desc="Processing regions"):
            reg_code = row['REG_norm']
            reg_name = row['LIBELLE']
            
            if reg_code is None:
                continue
            
            # Get all communes in this region using normalized columns
            communes_in_region = self.df_communes[
                self.df_communes['REG_norm'] == reg_code
            ]['COM_norm'].tolist()
            # Filter out None values
            communes_in_region = [c for c in communes_in_region if c is not None]
            
            # Get departments in this region using normalized columns
            deps_in_region = self.df_departements[
                self.df_departements['REG_norm'] == reg_code
            ]['DEP_norm'].tolist()
            dep_names = [self.dep_code_to_name.get(d, '') for d in deps_in_region]
            
            # Fetch SIREN and SIRET from API
            siren, siret = self.get_siren_siret_from_collectivite_api(reg_code)
            
            data = self._create_base_row()
            data.update({
                'Name-zlv': f'Région {reg_name}',
                'Name-source': reg_name,
                'Kind-admin': 'REG',
                'Kind-admin_label': 'Région',
                'Siren': siren,
                'Siret': siret,
                'Layer-geo_label': 'Région',
                'Geo_Perimeter': communes_in_region,
                'Dep_Code': deps_in_region,
                'Dep_Name': dep_names,
                'Reg_Code': [reg_code],
                'Reg_Name': [reg_name]
            })
            results.append(data)
        
        print(f"Processed {len(results)} regions")
        return results
    
    def process_departements(self) -> List[Dict]:
        """Process all departments."""
        print("Processing departments...")
        results = []
        
        for _, row in tqdm(self.df_departements.iterrows(), total=len(self.df_departements), desc="Processing departments"):
            dep_code = row['DEP_norm']
            dep_name = row['LIBELLE']
            reg_code = row['REG_norm']
            reg_name = self.reg_code_to_name.get(reg_code, '')
            
            if dep_code is None:
                continue
            
            # Get all communes in this department using normalized columns
            communes_in_dep = self.df_communes[
                self.df_communes['DEP_norm'] == dep_code
            ]['COM_norm'].tolist()
            # Filter out None values
            communes_in_dep = [c for c in communes_in_dep if c is not None]
            
            # Fetch SIREN and SIRET from API (add "D" suffix for departments)
            siren, siret = self.get_siren_siret_from_collectivite_api(f"{dep_code}D")
            
            # Fallback to query by name if not found (for special departments like Corse-du-Sud, Paris, etc.)
            if siren is None or siret is None:
                print("-> Fall back using the query and nature juridique")
                siren, siret = self.get_siren_siret_from_query_and_nature_juridique(dep_name, '7220')
            
            data = self._create_base_row()
            data.update({
                'Name-zlv': f'Département {dep_name}',
                'Name-source': dep_name,
                'Kind-admin': 'DEP',
                'Kind-admin_label': 'Département',
                'Siren': siren,
                'Siret': siret,
                'Layer-geo_label': 'Département',
                'Geo_Perimeter': communes_in_dep,
                'Dep_Code': [dep_code],
                'Dep_Name': [dep_name],
                'Reg_Code': [reg_code],
                'Reg_Name': [reg_name]
            })
            results.append(data)
        
        print(f"Processed {len(results)} departments")
        return results

    def get_siren_siret_from_insee_code(self, insee_code: str):
        """
        Returns a tuple (siren, siret) for a given INSEE code.
        Uses the INSEE to SIREN mapping, then queries DuckDB for SIRET.
        
        Args:
            insee_code: The INSEE code of the commune
            
        Returns:
            tuple: (siren, siret) or (None, None) if not found
        """
        # Step 1: Get SIREN from INSEE code mapping
        siren = self.insee_to_siren.get(insee_code)

        if siren is None:
            return None, None
        
        return siren, self.get_siret_from_siren(siren)

    def get_siret_from_siren(self, siren: str):
        """
        Returns the SIRET for a given SIREN.
        """
        query = f"""
            SELECT nicSiegeUniteLegale
            FROM '{PARQUET_PATH}'
            WHERE siren = '{siren}'
            LIMIT 1;
        """
        try:
            con = duckdb.connect(database=':memory:')
            result = con.execute(query).fetchone()
            if result:
                nic = result[0]
                siret = f"{siren}{str(nic).zfill(5)}"
                return siret
            else:
                return None
        except Exception as e:
            print(f"⚠️ DuckDB error in get_siret_from_siren: {e}")
            return None
    
    def get_siren_siret_for_paris_arrondissement(self, arrondissement_name: str) -> tuple:
        """
        Get SIREN and SIRET for Paris arrondissements from the Sirene parquet file.
        
        Args:
            arrondissement_name: Name of the arrondissement (e.g., "Paris 1er Arrondissement")
            
        Returns:
            tuple: (siren, siret) or (None, None) if not found
        """
        # Mapping of arrondissement numbers to French ordinal names as they appear in the database
        number_to_french = {
            '1': 'PREMIER',
            '2': 'DEUXIEME',
            '3': 'TROISIEME',
            '4': 'QUATRIEME',
            '5': 'CINQUIEME',
            '6': 'SIXIEME',
            '7': 'SEPTIEME',
            '8': 'HUITIEME',
            '9': 'NEUVIEME',
            '10': 'DIXIEME',
            '11': 'ONZIEME',
            '12': 'DOUZIEME',
            '13': 'TREIZIEME',
            '14': 'QUATORZIEME',
            '15': 'QUINZIEME',
            '16': 'SEIZIEME',
            '17': 'DIX SEPTIEME',
            '18': 'DIX HUITIEME',
            '19': 'DIX NEUVIEME',
            '20': 'VINGTIEME'
        }
        
        # Extract the arrondissement number (e.g., "1er", "2e", "10e", "20e")
        # The name format is typically "Paris 1er Arrondissement", "Paris 2e Arrondissement", etc.
        match = re.search(r'(\d+)(er|e)', arrondissement_name)
        if not match:
            print(f"⚠️ Could not extract arrondissement number from: {arrondissement_name}")
            return None, None
        
        arrond_number = match.group(1)  # e.g., "1", "2", "10", "20"
        
        # Get the French written form
        french_ordinal = number_to_french.get(arrond_number)
        if not french_ordinal:
            print(f"⚠️ No French ordinal mapping for arrondissement number: {arrond_number}")
            return None, None
        
        query = f"""
            SELECT siren, nicSiegeUniteLegale
            FROM '{PARQUET_PATH}'
            WHERE denominationUniteLegale LIKE '%ARRONDISSEMENT%'
            AND (denominationUniteLegale LIKE 'COM %' OR denominationUniteLegale LIKE 'COMMUNE%')
            AND denominationUniteLegale LIKE '%PARIS%'
            AND denominationUniteLegale LIKE '%{french_ordinal}%'
            LIMIT 1;
        """
        try:
            con = duckdb.connect(database=':memory:')
            result = con.execute(query).fetchone()
            if result:
                siren = result[0]
                nic = result[1]
                siret = f"{siren}{str(nic).zfill(5)}"
                return siren, siret
            else:
                print(f"⚠️ No data found for french_ordinal : {french_ordinal} ")
                return None, None
        except Exception as e:
            print(f"⚠️ DuckDB error for arrondissement {arrondissement_name}: {e}")
            return None, None
    
    def get_siren_siret_for_tom_commune(self, commune_name: str) -> tuple:
        """
        Get SIREN and SIRET for TOM communes from the Sirene parquet file.
        
        Args:
            commune_name: Name of the commune (e.g., "Ua Huka", "Kouaoua")
            
        Returns:
            tuple: (siren, siret) or (None, None) if not found
        """
        # Normalize the commune name: replace special characters with space and uppercase
        normalized_name = re.sub(r'[^A-Za-z0-9\s]', ' ', commune_name).upper()
        
        query = f"""
            SELECT siren, nicSiegeUniteLegale
            FROM '{PARQUET_PATH}' siren_db
            JOIN '{PARQUET_GEOLOC_PATH}' siren_geo_db 
                ON (siren_db.siren || lpad(CAST(siren_db.nicSiegeUniteLegale as VARCHAR), 5, '0')) = siren_geo_db.siret
            WHERE denominationUniteLegale LIKE '%COMMUNE%'
            AND denominationUniteLegale LIKE '%{normalized_name}%'
            AND plg_code_commune LIKE '975%'
            LIMIT 1;
        """
        try:
            con = duckdb.connect(database=':memory:')
            result = con.execute(query).fetchone()
            if result:
                siren = result[0]
                nic = result[1]
                siret = f"{siren}{str(nic).zfill(5)}"
                return siren, siret
            else:
                return None, None
        except Exception as e:
            print(f"⚠️ DuckDB error for TOM commune {commune_name}: {e}")
            return None, None
    
    def get_siren_siret_from_collectivite_api(self, code_collectivite: str) -> tuple:
        """
        Fetch SIREN and SIRET from API Recherche Entreprises for a territorial collectivity.
        
        Args:
            code_collectivite: The code to use in the API (e.g., "01D" for department, "01" for region)
            
        Returns:
            tuple: (siren, siret) or (None, None) if not found
        """
        code_collectivite = code_collectivite.zfill(2)
        url = f"https://recherche-entreprises.api.gouv.fr/search?code_collectivite_territoriale={code_collectivite}&etat_administratif=A"
        
        try:
            # Add a small delay to avoid rate limiting
            time.sleep(SLEEP_TIME)
            
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            
            if data.get('total_results', 0) > 0 and data.get('results'):
                result = data['results'][0]
                siren = result.get('siren')
                siret = result.get('siege', {}).get('siret')
                return siren, siret
            else:
                print(f"⚠️ No results found for code {code_collectivite}")
                return None, None
                
        except requests.exceptions.RequestException as e:
            print(f"⚠️ API error for code {code_collectivite}: {e}")
            return None, None
        except (KeyError, IndexError, ValueError) as e:
            print(f"⚠️ Data parsing error for code {code_collectivite}: {e}")
            return None, None

    def get_siren_siret_from_query_and_nature_juridique(self,query: str, nature_juridique: str = '7229') -> tuple:
        """
        Fetch SIREN and SIRET from API Recherche Entreprises for a query and nature juridique.
        """
        url = f"https://recherche-entreprises.api.gouv.fr/search?q={query}&nature_juridique={nature_juridique}&etat_administratif=A"
        try:
            time.sleep(SLEEP_TIME)
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            data = response.json()
            if data.get('total_results', 0) > 0 and data.get('results'):
                result = data['results'][0]
                siren = result.get('siren')
                siret = result.get('siege', {}).get('siret')
                return siren, siret
            else:
                return None, None
        except requests.exceptions.RequestException as e:
            print(f"⚠️ API error for query {query}: {e}")
            return None, None
        except (KeyError, IndexError, ValueError) as e:
            print(f"⚠️ Data parsing error for query {query}: {e}")
            return None, None
        except Exception as e:
            print(f"⚠️ Error for query {query}: {e}")
            return None, None
    
    def get_siren_siret_from_tom_collectivity_api(self, department_code: str, nature_juridique: str = '7229') -> tuple:
        """
        Fetch SIREN and SIRET from API Recherche Entreprises for TOM collectivities.
        Uses departement + nature_juridique 7229 to find the collectivity.
        
        Args:
            department_code: The department code (e.g., "988" for Nouvelle-Calédonie)
            
        Returns:
            tuple: (siren, siret) or (None, None) if not found
        """
        url = f"https://recherche-entreprises.api.gouv.fr/search?departement={department_code}&nature_juridique={nature_juridique}&etat_administratif=A"
        
        try:
            time.sleep(SLEEP_TIME)
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            if data.get('total_results', 0) > 0 and data.get('results'):
                # Take the first result (should be the TOM collectivity)
                result = data['results'][0]
                siren = result.get('siren')
                siret = result.get('siege', {}).get('siret')
                return siren, siret
            else:
                print(f"⚠️ No results found for TOM department {department_code}")
                return None, None
                
        except requests.exceptions.RequestException as e:
            print(f"⚠️ API error for TOM department {department_code}: {e}")
            return None, None
        except (KeyError, IndexError, ValueError) as e:
            print(f"⚠️ Data parsing error for TOM department {department_code}: {e}")
            return None, None


    def process_ept(self) -> List[Dict]:
        """Process all EPT (Établissement Public Territorial)."""
        print("Processing EPT...")
        results = []
        
        for _, row in self.df_ept_main.iterrows():
            ept_code = row['EPT_norm']
            ept_name = row['LIBEPT']
            
            if ept_code is None:
                continue
            
            # Get communes in this EPT from composition sheet using normalized columns
            communes_in_ept = self.df_ept_composition[
                self.df_ept_composition['EPT_norm'] == ept_code
            ]['CODGEO_norm'].tolist()
            # Filter out None values
            communes_in_ept = [c for c in communes_in_ept if c is not None]
            
            if not communes_in_ept:
                continue
            
            # Get department and region info
            dep_codes, dep_names = self._get_dep_info(communes_in_ept)
            reg_code, reg_name = self._get_reg_info(communes_in_ept)
            siret = self.get_siret_from_siren(ept_code)
            
            data = self._create_base_row()
            data.update({
                'Name-zlv': f'EPT {ept_name}',
                'Name-source': ept_name,
                'Kind-admin': 'EPT',
                'Kind-admin_label': 'Établissement Public Territorial',
                'Siren': ept_code,
                'Siret': siret,
                'Layer-geo_label': 'Intercommunalité',
                'Geo_Perimeter': communes_in_ept,
                'Dep_Code': dep_codes,
                'Dep_Name': dep_names,
                'Reg_Code': [reg_code] if reg_code else [],
                'Reg_Name': [reg_name] if reg_name else []
            })
            results.append(data)
        
        print(f"Processed {len(results)} EPT")
        return results
    
    def process_epci(self) -> List[Dict]:
        """Process all EPCI (ME, CU, CA, CC)."""
        print("Processing EPCI...")
        results = []
        
        for _, row in self.df_epci_main.iterrows():
            epci_code = row['EPCI_norm']
            epci_name = row['LIBEPCI']
            nature = row['NATURE_EPCI']
            
            if epci_code is None:
                continue
            
            # Get communes in this EPCI from composition sheet using normalized columns
            communes_in_epci = self.df_epci_composition[
                self.df_epci_composition['EPCI_norm'] == epci_code
            ]['CODGEO_norm'].tolist()
            # Filter out None values
            communes_in_epci = [c for c in communes_in_epci if c is not None]
            
            if not communes_in_epci:
                continue
            
            # Get department and region info
            dep_codes, dep_names = self._get_dep_info(communes_in_epci)
            reg_code, reg_name = self._get_reg_info(communes_in_epci)
            siret = self.get_siret_from_siren(epci_code)
            # Determine name and label based on nature
            main_dep_code = dep_codes[0] if isinstance(dep_codes, list) else dep_codes
            if nature == 'ME':
                name_zlv = epci_name  # Métropole de Lyon, Bordeaux Métropole, etc.
                kind_admin = 'METRO'
                kind_label = 'Métropole'
            elif nature == 'CU':
                kind_admin = nature
                # Remove "Communauté urbaine" from name
                name_cleaned = epci_name.replace('Communauté urbaine ', '').replace('Communauté Urbaine ', '')
                name_zlv = f'CU {name_cleaned}'
                kind_label = 'Communauté Urbaine'
            elif nature == 'CA':
                kind_admin = nature
                # Remove "Communauté d'agglomération" from name
                name_cleaned = epci_name.replace("Communauté d'agglomération ", '').replace("Communauté d'Agglomération ", '')
                name_cleaned = name_cleaned.replace("Communauté d'agglomération de ", '').replace("Communauté d'agglomération du ", '')
                name_zlv = f'CA {name_cleaned}'
                kind_label = "Communauté d'Agglomération"
            elif nature == 'CC':
                kind_admin = nature
                # Remove "Communauté de communes" from name
                name_cleaned = epci_name.replace('Communauté de communes ', '').replace('Communauté de Communes ', '')
                name_cleaned = name_cleaned.replace('Communauté de communes de ', '').replace('Communauté de communes du ', '')
                name_zlv = f'CC {name_cleaned}'
                kind_label = 'Communauté des Communes'
            else:
                kind_admin = nature
                name_zlv = epci_name
                kind_label = nature if nature != 'METRO' else 'Métropole'

            name_zlv = f'{name_zlv} ({main_dep_code})'
            
            data = self._create_base_row()
            data.update({
                'Name-zlv': name_zlv,
                'Name-source': epci_name,
                'Kind-admin': kind_admin,
                'Kind-admin_label': kind_label,
                'Siren': epci_code,
                'Siret': siret,
                'Layer-geo_label': 'Intercommunalité',
                'Geo_Perimeter': communes_in_epci,
                'Dep_Code': dep_codes,
                'Dep_Name': dep_names,
                'Reg_Code': [reg_code] if reg_code else [],
                'Reg_Name': [reg_name] if reg_name else []
            })
            results.append(data)
        
        print(f"Processed {len(results)} EPCI")
        return results
    
    def process_communes(self) -> List[Dict]:
        """Process all communes."""
        print("Processing communes...")
        results = []
        
        for _, row in tqdm(self.df_communes.iterrows(), total=len(self.df_communes), desc="Processing communes"):
            com_code = row['COM_norm']
            com_name = row['LIBELLE']
            dep_code = row['DEP_norm']
            reg_code = row['REG_norm']
            typecom = row.get('TYPECOM', 'COM')
            
            # Skip if essential data is missing
            if com_code is None or dep_code is None or reg_code is None:
                continue
            
            dep_name = self.dep_code_to_name.get(dep_code, '')
            reg_name = self.reg_code_to_name.get(reg_code, '')
            
            # Handle different types of communes
            siren = None
            siret = None
            
            if typecom == 'ARM':
                # Arrondissement
                name_zlv = com_name
                kind_admin = 'ARR'
                kind_label = 'Arrondissement'
                layer_label = 'Arrondissement'
                
                # For Paris arrondissements, query the parquet file
                if 'Paris' in com_name:
                    siren, siret = self.get_siren_siret_for_paris_arrondissement(com_name)
                # For Lyon and Marseille arrondissements, no SIREN/SIRET in parquet file
                # so they remain None
                
            elif com_name == 'Paris':
                # Special case for Paris
                name_zlv = 'Ville de Paris'
                kind_admin = 'COM'
                kind_label = 'Commune'
                layer_label = 'Commune'
                # Get SIREN and SIRET from INSEE code
                siren, siret = self.get_siren_siret_from_insee_code(com_code)
            else:
                # Regular commune
                name_zlv = f'Commune de {com_name} ({dep_code})'
                kind_admin = 'COM'
                kind_label = 'Commune'
                layer_label = 'Commune'
                # Get SIREN and SIRET from INSEE code
                siren, siret = self.get_siren_siret_from_insee_code(com_code)
            
            data = self._create_base_row()
            data.update({
                'Name-zlv': name_zlv,
                'Name-source': com_name,
                'Kind-admin': kind_admin,
                'Kind-admin_label': kind_label,
                'Siren': siren,
                'Siret': siret,
                'Layer-geo_label': layer_label,
                'Geo_Perimeter': [com_code],
                'Dep_Code': [dep_code],
                'Dep_Name': [dep_name],
                'Reg_Code': [reg_code],
                'Reg_Name': [reg_name]
            })
            
            results.append(data)
        
        print(f"Processed {len(results)} communes")
        return results
    
    def process_tom_departments(self) -> List[Dict]:
        """Process TOM (Territoires d'Outre-Mer) collectivities."""
        print("Processing TOM collectivities...")
        results = []
        
        for _, row in tqdm(self.df_departements_tom.iterrows(), total=len(self.df_departements_tom), desc="Processing TOM collectivities"):
            dep_code = row['DEP_norm']
            dep_name = row['LIBELLE']
            
            if dep_code is None:
                continue
            
            # Get all communes in this TOM department using normalized columns
            communes_in_dep = self.df_communes_tom[
                self.df_communes_tom['DEP_norm'] == dep_code
            ]['COM_norm'].tolist()
            # Filter out None values
            communes_in_dep = [c for c in communes_in_dep if c is not None]
            
            # Fetch SIREN and SIRET from API for the TOM collectivity
            siren, siret = self.get_siren_siret_from_tom_collectivity_api(dep_code, '7229')
            if siren is None or siret is None:
                siren, siret = self.get_siren_siret_from_tom_collectivity_api(dep_code, '7225')
            
            data = self._create_base_row()
            data.update({
                'Name-zlv': f'Collectivité {dep_name}',
                'Name-source': dep_name,
                'Kind-admin': 'TOM',
                'Kind-admin_label': 'Territoire d\'Outre-Mer',
                'Siren': siren,
                'Siret': siret,
                'Layer-geo_label': 'Collectivité TOM',
                'Geo_Perimeter': communes_in_dep,
                'Dep_Code': [dep_code],
                'Dep_Name': [dep_name],
                'Reg_Code': [],  # TOM collectivities don't have regions
                'Reg_Name': []
            })
            results.append(data)
        
        print(f"Processed {len(results)} TOM collectivities")
        return results
    
    def process_tom_communes(self) -> List[Dict]:
        """Process TOM communes."""
        print("Processing TOM communes...")
        results = []
        
        for _, row in tqdm(self.df_communes_tom.iterrows(), total=len(self.df_communes_tom), desc="Processing TOM communes"):
            com_code = row['COM_norm']
            com_name = row['LIBELLE']
            dep_code = row['DEP_norm']
            
            if com_code is None or dep_code is None:
                continue
            
            dep_name = self.dep_code_to_name.get(dep_code, '')
            
            # Get SIREN/SIRET from the parquet file using commune name
            siren, siret = self.get_siren_siret_for_tom_commune(com_name)
            
            data = self._create_base_row()
            data.update({
                'Name-zlv': f'Commune de {com_name} ({dep_code})',
                'Name-source': com_name,
                'Kind-admin': 'COM-TOM',
                'Kind-admin_label': 'Commune TOM',
                'Siren': siren,
                'Siret': siret,
                'Layer-geo_label': 'Commune',
                'Geo_Perimeter': [com_code],
                'Dep_Code': [dep_code],
                'Dep_Name': [dep_name],
                'Reg_Code': [],  # TOM communes don't have regions
                'Reg_Name': []
            })
            results.append(data)
        
        print(f"Processed {len(results)} TOM communes")
        return results
    
    def process_all(self) -> pd.DataFrame:
        """Process all collectivities and return a combined DataFrame."""
        print("\n=== Starting collectivity processing ===\n")
        
        all_results = []
        
        # Process each type
        all_results.extend(self.process_regions())
        all_results.extend(self.process_departements())
        all_results.extend(self.process_tom_departments())
        all_results.extend(self.process_ept())
        all_results.extend(self.process_epci())
        all_results.extend(self.process_communes())
        all_results.extend(self.process_tom_communes())
        
        # Convert to DataFrame
        df = pd.DataFrame(all_results)
        
        print(f"\n=== Processing complete! ===")
        print(f"Total collectivities: {len(df)}")
        return df


def main():
    """Main execution function."""
    # Initialize processor
    processor = CollectivityProcessor()
    
    # Process all data
    df_collectivities = processor.process_all()
    
    # Save to CSV
    output_file = 'collectivities_processed.csv'
    df_collectivities.to_csv(output_file, index=False)
    print(f"\nData saved to {output_file}")
    
    # Save to Excel with better formatting
    output_excel = 'collectivities_processed.xlsx'
    df_collectivities.to_excel(output_excel, index=False)
    print(f"Data saved to {output_excel}")
    return df_collectivities


if __name__ == '__main__':
    df = main()
    df.to_csv('collectivities_processed.csv', index=False)

