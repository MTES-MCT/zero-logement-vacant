#!/usr/bin/env python3
"""
Dataset Builder for Address Classification Testing

This script downloads and processes open data from various sources to create
comprehensive test datasets for address classification with proper labels.
"""

import argparse
import logging
import sys
import os
import json
import csv
import zipfile
import random
import pickle
import lzma
from datetime import datetime
from typing import List, Dict, Tuple
from urllib.request import urlretrieve
from urllib.parse import urljoin
import requests
import pandas as pd
from tqdm import tqdm

# Add the project root to Python path for imports
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', '..'))

class AddressDatasetBuilder:
    """Builds comprehensive test datasets from open data sources."""

    def __init__(self):
        """Initialize the dataset builder."""
        self.data_dir = os.path.join(os.path.dirname(__file__), 'test_data')
        self.cache_dir = os.path.join(self.data_dir, 'cache')
        self.output_dir = os.path.join(self.data_dir, 'datasets')

        # Create directories
        for directory in [self.data_dir, self.cache_dir, self.output_dir]:
            os.makedirs(directory, exist_ok=True)

        self.datasets = {
            'deepparse_data': {
                'url': 'https://graal.ift.ulaval.ca/public/deepparse/dataset/data.zip',
                'filename': 'deepparse-data.zip',
                'label': 'MIXED',
                'sample_size': 10000,
                'description': 'Professional address dataset with 100k+ French addresses'
            },
            'international_cities': {
                'url': 'https://raw.githubusercontent.com/holtzy/The-Python-Graph-Gallery/master/static/data/world-cities.csv',
                'filename': 'world-cities.csv',
                'label': 'MIXED',
                'sample_size': 1000,
                'description': 'World cities dataset (mixed countries)'
            }
        }

        # Hardcoded quality test addresses with known labels
        self.quality_test_addresses = [
            # Clear French addresses
            ("25 Rue du Faubourg Saint-Antoine, 75011 Paris", "FRANCE"),
            ("123 Avenue des Champs-Élysées, 75008 Paris", "FRANCE"),
            ("45 Cours Mirabeau, 13100 Aix-en-Provence", "FRANCE"),
            ("12 Place Bellecour, 69002 Lyon", "FRANCE"),
            ("Villa Rothschild, 06230 Saint-Jean-Cap-Ferrat", "FRANCE"),
            ("Château de Versailles, 78000 Versailles", "FRANCE"),
            ("15 bis rue de la Paix, 75002 Paris", "FRANCE"),
            ("Résidence Les Palmiers, 34000 Montpellier", "FRANCE"),
            ("Domaine de la Romanée-Conti, 21700 Vosne-Romanée", "FRANCE"),
            ("Port de Plaisance, 83990 Saint-Tropez", "FRANCE"),

            # DOM-TOM (should be FRANCE)
            ("Fort-de-France, 97200 Martinique", "FRANCE"),
            ("Pointe-à-Pitre, 97110 Guadeloupe", "FRANCE"),
            ("Saint-Denis, 97400 Réunion", "FRANCE"),
            ("Cayenne, 97300 Guyane française", "FRANCE"),
            ("Mamoudzou, 97600 Mayotte", "FRANCE"),
            ("Nouméa, 98800 Nouvelle-Calédonie", "FRANCE"),
            ("Papeete, 98714 Polynésie française", "FRANCE"),

            # Clear foreign addresses
            ("123 Main Street, New York, NY 10001, USA", "FOREIGN"),
            ("456 Oxford Street, London W1D 1BS, UK", "FOREIGN"),
            ("Via del Corso 123, 00186 Roma, Italy", "FOREIGN"),
            ("Unter den Linden 1, 10117 Berlin, Germany", "FOREIGN"),
            ("Calle Mayor 15, 28013 Madrid, Spain", "FOREIGN"),
            ("Rue de la Loi 175, 1048 Bruxelles, Belgium", "FOREIGN"),
            ("Damrak 70, 1012 LM Amsterdam, Netherlands", "FOREIGN"),
            ("Bahnhofstrasse 1, 8001 Zürich, Switzerland", "FOREIGN"),
            ("Times Square, New York, NY 10036, USA", "FOREIGN"),
            ("Red Square, Moscow 109012, Russia", "FOREIGN"),
            ("P.O. Box 123, Toronto, ON M5V 3A8, Canada", "FOREIGN"),
            ("1600 Pennsylvania Avenue, Washington DC 20500, USA", "FOREIGN"),
            ("Buckingham Palace, London SW1A 1AA, UK", "FOREIGN"),
            ("Colosseum, Piazza del Colosseo, Rome, Italy", "FOREIGN"),
            ("Brandenburg Gate, Berlin, Germany", "FOREIGN"),

            # Ambiguous/tricky cases
            ("Monaco-Ville, 98000 Monaco", "FOREIGN"),
            ("Avenue de France, 1202 Genève, Switzerland", "FOREIGN"),
            ("Rue de France, Brussels, Belgium", "FOREIGN"),
            ("Paris, Texas 75460, USA", "FOREIGN"),
            ("London, Ontario N6A 3K7, Canada", "FOREIGN"),
            ("Saint-Louis, Missouri 63103, USA", "FOREIGN"),
            ("Lyon, Georgia 30436, USA", "FOREIGN"),
            ("Nice, California 95464, USA", "FOREIGN"),
            ("Orleans, Massachusetts 02653, USA", "FOREIGN"),
            ("Calais, Maine 04619, USA", "FOREIGN"),

            # European addresses with French-sounding names
            ("Rue de la Paix, 1202 Geneva, Switzerland", "FOREIGN"),
            ("Avenue de la Liberté, L-1931 Luxembourg", "FOREIGN"),
            ("Place de la Constitution, Brussels, Belgium", "FOREIGN"),
            ("Champs-Élysées Shopping Center, Berlin, Germany", "FOREIGN"),

            # International major cities
            ("Tokyo Station, Tokyo 100-0005, Japan", "FOREIGN"),
            ("Sydney Opera House, Sydney NSW 2000, Australia", "FOREIGN"),
            ("CN Tower, Toronto, ON M5V 3E6, Canada", "FOREIGN"),
            ("Christ the Redeemer, Rio de Janeiro, Brazil", "FOREIGN"),
            ("Machu Picchu, Cusco, Peru", "FOREIGN"),
            ("Great Wall of China, Beijing, China", "FOREIGN"),
            ("Taj Mahal, Agra, Uttar Pradesh, India", "FOREIGN"),
            ("Pyramids of Giza, Giza, Egypt", "FOREIGN"),

            # Cities with French colonial history (should be FOREIGN)
            ("Libreville, Gabon", "FOREIGN"),
            ("Dakar, Sénégal", "FOREIGN"),
            ("Abidjan, Côte d'Ivoire", "FOREIGN"),
            ("Casablanca, Morocco", "FOREIGN"),
            ("Tunis, Tunisia", "FOREIGN"),
            ("Algiers, Algeria", "FOREIGN"),
            ("Hanoi, Vietnam", "FOREIGN"),
            ("Phnom Penh, Cambodia", "FOREIGN"),
        ]

    def download_file(self, url: str, filename: str) -> str:
        """Download a file from URL to cache directory."""
        filepath = os.path.join(self.cache_dir, filename)

        if os.path.exists(filepath):
            logging.info(f"Using cached file: {filename}")
            return filepath

        logging.info(f"Downloading {filename} from {url}")
        try:
            # Use requests for better error handling
            response = requests.get(url, stream=True, timeout=30)
            response.raise_for_status()

            total_size = int(response.headers.get('content-length', 0))

            with open(filepath, 'wb') as f, tqdm(
                desc=filename,
                total=total_size,
                unit='iB',
                unit_scale=True,
                unit_divisor=1024,
            ) as bar:
                for chunk in response.iter_content(chunk_size=8192):
                    size = f.write(chunk)
                    bar.update(size)

            logging.info(f"Downloaded: {filename}")
            return filepath

        except Exception as e:
            logging.error(f"Failed to download {filename}: {e}")
            # Create a sample file if download fails
            return self.create_sample_data(filename)

    def create_sample_data(self, filename: str) -> str:
        """Create sample data when download fails."""
        filepath = os.path.join(self.cache_dir, filename)

        if 'france' in filename.lower() or 'adresses' in filename.lower():
            # Create French addresses sample
            sample_data = [
                {"id": 1, "numero": "123", "voie": "Rue de la Paix", "code_postal": "75001", "commune": "Paris", "latitude": 48.8566, "longitude": 2.3522},
                {"id": 2, "numero": "45", "voie": "Avenue Foch", "code_postal": "75116", "commune": "Paris", "latitude": 48.8738, "longitude": 2.2874},
                {"id": 3, "numero": "78", "voie": "Boulevard Saint-Germain", "code_postal": "75006", "commune": "Paris", "latitude": 48.8534, "longitude": 2.3488},
                {"id": 4, "numero": "12", "voie": "Place Bellecour", "code_postal": "69002", "commune": "Lyon", "latitude": 45.7578, "longitude": 4.8320},
                {"id": 5, "numero": "25", "voie": "Cours Mirabeau", "code_postal": "13100", "commune": "Aix-en-Provence", "latitude": 43.5263, "longitude": 5.4454},
            ]

        else:
            # Create world cities sample
            sample_data = [
                {"city": "London", "country": "United Kingdom", "latitude": 51.5074, "longitude": -0.1278},
                {"city": "New York", "country": "United States", "latitude": 40.7128, "longitude": -74.0060},
                {"city": "Tokyo", "country": "Japan", "latitude": 35.6762, "longitude": 139.6503},
                {"city": "Berlin", "country": "Germany", "latitude": 52.5200, "longitude": 13.4050},
                {"city": "Rome", "country": "Italy", "latitude": 41.9028, "longitude": 12.4964},
            ]

        df = pd.DataFrame(sample_data)
        df.to_csv(filepath, index=False, encoding='utf-8')
        logging.warning(f"Created sample data: {filename}")
        return filepath

    def process_french_addresses(self, filepath: str, sample_size: int = 1000) -> List[Tuple[str, str]]:
        """Process French addresses from BAN data."""
        addresses = []

        try:
            # Try to read the file with different encodings
            encodings = ['utf-8', 'latin-1', 'cp1252']
            df = None

            for encoding in encodings:
                try:
                    df = pd.read_csv(filepath, encoding=encoding, nrows=sample_size * 10)
                    break
                except UnicodeDecodeError:
                    continue

            if df is None:
                raise Exception("Could not read file with any encoding")

            # Try different column name combinations
            address_columns = []
            if 'numero' in df.columns and 'voie' in df.columns:
                address_columns = ['numero', 'voie', 'commune', 'code_postal']
            elif 'address' in df.columns:
                address_columns = ['address']
            elif 'adresse' in df.columns:
                address_columns = ['adresse']
            else:
                # Use first few text columns
                text_cols = df.select_dtypes(include=['object']).columns[:4]
                address_columns = text_cols.tolist()

            logging.info(f"Found columns: {df.columns.tolist()}")
            logging.info(f"Using address columns: {address_columns}")

            sample_df = df.dropna(subset=address_columns).sample(min(sample_size, len(df)))

            for _, row in sample_df.iterrows():
                try:
                    if len(address_columns) > 1:
                        # Combine columns to form address
                        address_parts = []
                        for col in address_columns:
                            if pd.notna(row[col]) and str(row[col]).strip():
                                address_parts.append(str(row[col]).strip())
                        address = ', '.join(address_parts)
                    else:
                        address = str(row[address_columns[0]]).strip()

                    if address and len(address) > 10:  # Filter out very short addresses
                        addresses.append((address, "FRANCE"))

                except Exception as e:
                    logging.debug(f"Error processing row: {e}")
                    continue

            logging.info(f"Processed {len(addresses)} French addresses")

        except Exception as e:
            logging.error(f"Error processing French addresses: {e}")
            # Return some hardcoded French addresses as fallback
            addresses = [
                ("123 Rue de Rivoli, 75001 Paris", "FRANCE"),
                ("45 Avenue Foch, 75116 Paris", "FRANCE"),
                ("12 Place Bellecour, 69002 Lyon", "FRANCE"),
                ("25 Cours Mirabeau, 13100 Aix-en-Provence", "FRANCE"),
                ("78 Boulevard Saint-Germain, 75006 Paris", "FRANCE"),
            ]

        return addresses

    def process_international_addresses(self, filepath: str, sample_size: int = 1000) -> List[Tuple[str, str]]:
        """Process international addresses from world cities data."""
        addresses = []

        try:
            df = pd.read_csv(filepath, encoding='utf-8')

            # Filter out French cities
            if 'country' in df.columns:
                non_french = df[~df['country'].str.contains('France|french', case=False, na=False)]
            else:
                non_french = df

            sample_df = non_french.sample(min(sample_size, len(non_french)))

            for _, row in sample_df.iterrows():
                try:
                    city = str(row.get('city', row.get('name', ''))).strip()
                    country = str(row.get('country', row.get('country_name', ''))).strip()

                    if city and country:
                        if country.lower() in ['france', 'french']:
                            continue  # Skip French cities

                        address = f"{city}, {country}"
                        addresses.append((address, "FOREIGN"))

                except Exception as e:
                    logging.debug(f"Error processing international row: {e}")
                    continue

            logging.info(f"Processed {len(addresses)} international addresses")

        except Exception as e:
            logging.error(f"Error processing international addresses: {e}")
            # Return some hardcoded international addresses as fallback
            addresses = [
                ("London, United Kingdom", "FOREIGN"),
                ("New York, United States", "FOREIGN"),
                ("Tokyo, Japan", "FOREIGN"),
                ("Berlin, Germany", "FOREIGN"),
                ("Rome, Italy", "FOREIGN"),
            ]

        return addresses

    def process_deepparse_dataset(self, filepath: str, sample_size: int = 5000) -> List[Tuple[str, str]]:
        """Process deepparse dataset to extract French and international addresses."""
        addresses = []

        try:
            # Try to extract and load the deepparse dataset
            extract_dir = os.path.join(self.cache_dir, 'deepparse_extracted')
            os.makedirs(extract_dir, exist_ok=True)

            if filepath.endswith('.zip'):
                with zipfile.ZipFile(filepath, 'r') as zip_ref:
                    zip_ref.extractall(extract_dir)

            # Look for pickle files in the extracted directory
            pickle_files = []
            for root, dirs, files in os.walk(extract_dir):
                for file in files:
                    if file.endswith('.pkl') or file.endswith('.pickle'):
                        pickle_files.append(os.path.join(root, file))

            logging.info(f"Found pickle files: {pickle_files}")

            for pickle_file in pickle_files[:3]:  # Process first few files
                try:
                    with open(pickle_file, 'rb') as f:
                        data = pickle.load(f)

                    # Process the data structure
                    if isinstance(data, dict):
                        # Check for France data
                        if 'france' in pickle_file.lower() or any('france' in str(k).lower() for k in data.keys()):
                            country_data = data.get('france', data.get('France', data))
                            if isinstance(country_data, list):
                                for item in country_data[:sample_size//4]:
                                    if isinstance(item, str):
                                        addresses.append((item.strip(), "FRANCE"))
                                    elif isinstance(item, dict) and 'address' in item:
                                        addresses.append((item['address'].strip(), "FRANCE"))

                        # Check for international data
                        for country_key, country_data in data.items():
                            if isinstance(country_key, str) and country_key.lower() not in ['france']:
                                if isinstance(country_data, list):
                                    for item in country_data[:sample_size//20]:  # Smaller sample for foreign
                                        if isinstance(item, str):
                                            addresses.append((item.strip(), "FOREIGN"))
                                        elif isinstance(item, dict) and 'address' in item:
                                            addresses.append((item['address'].strip(), "FOREIGN"))

                    elif isinstance(data, list):
                        # Process as list of addresses
                        for item in data[:sample_size//4]:
                            if isinstance(item, str):
                                # Try to determine country from address
                                if self._looks_french(item):
                                    addresses.append((item.strip(), "FRANCE"))
                                else:
                                    addresses.append((item.strip(), "FOREIGN"))
                            elif isinstance(item, dict):
                                addr_str = item.get('address', str(item))
                                label = "FRANCE" if self._looks_french(addr_str) else "FOREIGN"
                                addresses.append((addr_str.strip(), label))

                    logging.info(f"Processed {pickle_file}: {len(addresses)} addresses so far")

                except Exception as e:
                    logging.warning(f"Failed to process {pickle_file}: {e}")
                    continue

        except Exception as e:
            logging.error(f"Error processing deepparse dataset: {e}")

        if not addresses:
            # Fallback to generating synthetic addresses
            addresses = self._generate_synthetic_addresses(sample_size)

        logging.info(f"Total addresses from deepparse: {len(addresses)}")
        return addresses

    def _looks_french(self, address: str) -> bool:
        """Quick heuristic to determine if an address looks French."""
        if not address:
            return False

        french_indicators = [
            'rue', 'avenue', 'boulevard', 'place', 'impasse', 'chemin', 'allée',
            'paris', 'lyon', 'marseille', 'toulouse', 'nice', 'nantes', 'bordeaux',
            'cedex', 'bis', 'ter', 'france'
        ]

        address_lower = address.lower()
        return any(indicator in address_lower for indicator in french_indicators)

    def _generate_synthetic_addresses(self, sample_size: int) -> List[Tuple[str, str]]:
        """Generate synthetic addresses when real data unavailable."""
        addresses = []

        # French addresses templates
        french_prefixes = ['Rue', 'Avenue', 'Boulevard', 'Place', 'Impasse', 'Chemin', 'Allée']
        french_names = ['de la Paix', 'Victor Hugo', 'Jean Jaurès', 'Charles de Gaulle', 'République',
                       'Liberté', 'Égalité', 'Fraternité', 'National', 'du Commerce', 'de la Mairie']
        french_cities = ['Paris', 'Lyon', 'Marseille', 'Toulouse', 'Nice', 'Nantes', 'Montpellier',
                        'Strasbourg', 'Bordeaux', 'Lille', 'Rennes', 'Reims', 'Saint-Étienne']

        for i in range(sample_size // 2):
            num = random.randint(1, 999)
            prefix = random.choice(french_prefixes)
            name = random.choice(french_names)
            city = random.choice(french_cities)
            postal = f"{random.randint(10000, 99999)}"

            address = f"{num} {prefix} {name}, {postal} {city}"
            addresses.append((address, "FRANCE"))

        # International addresses templates
        intl_prefixes = ['Street', 'Avenue', 'Road', 'Drive', 'Lane', 'Way']
        intl_names = ['Main', 'Oak', 'Elm', 'Park', 'Church', 'School', 'High', 'First', 'Second']
        intl_cities = ['London', 'New York', 'Berlin', 'Rome', 'Madrid', 'Amsterdam', 'Brussels']
        intl_countries = ['UK', 'USA', 'Germany', 'Italy', 'Spain', 'Netherlands', 'Belgium']

        for i in range(sample_size // 2):
            num = random.randint(1, 999)
            prefix = random.choice(intl_prefixes)
            name = random.choice(intl_names)
            city = random.choice(intl_cities)
            country = random.choice(intl_countries)

            address = f"{num} {name} {prefix}, {city}, {country}"
            addresses.append((address, "FOREIGN"))

        return addresses

    def create_test_dataset(self, name: str, size_per_category: int = 500) -> str:
        """Create a balanced test dataset with the specified name."""
        logging.info(f"Creating test dataset: {name}")

        all_addresses = []

        # Add quality test addresses (known good examples)
        all_addresses.extend(self.quality_test_addresses)
        logging.info(f"Added {len(self.quality_test_addresses)} quality test addresses")

        # Try to download and process real address data
        try:
            # Try deepparse dataset first (professional dataset)
            deepparse_file = self.download_file(
                self.datasets['deepparse_data']['url'],
                self.datasets['deepparse_data']['filename']
            )

            deepparse_addresses = self.process_deepparse_dataset(deepparse_file, size_per_category * 4)
            if deepparse_addresses:
                all_addresses.extend(deepparse_addresses)
                logging.info(f"Added {len(deepparse_addresses)} addresses from deepparse dataset")

        except Exception as e:
            logging.warning(f"Could not download deepparse dataset: {e}")

        # If we don't have enough addresses, add synthetic ones
        current_france = len([a for a in all_addresses if a[1] == "FRANCE"])
        current_foreign = len([a for a in all_addresses if a[1] == "FOREIGN"])

        if current_france < size_per_category or current_foreign < size_per_category:
            # Create additional French addresses manually
            french_addresses = [
                ("1 Avenue des Champs-Élysées, 75008 Paris", "FRANCE"),
                ("25 Rue du Faubourg Saint-Antoine, 75011 Paris", "FRANCE"),
                ("12 Place de la Bastille, 75011 Paris", "FRANCE"),
                ("45 Boulevard Saint-Germain, 75005 Paris", "FRANCE"),
                ("78 Rue de Rivoli, 75004 Paris", "FRANCE"),
                ("33 Avenue Montaigne, 75008 Paris", "FRANCE"),
                ("15 Place Vendôme, 75001 Paris", "FRANCE"),
                ("67 Rue Saint-Honoré, 75001 Paris", "FRANCE"),
                ("89 Boulevard Haussmann, 75008 Paris", "FRANCE"),
                ("21 Rue de la Paix, 75002 Paris", "FRANCE"),
                ("10 Place Bellecour, 69002 Lyon", "FRANCE"),
                ("25 Cours Mirabeau, 13100 Aix-en-Provence", "FRANCE"),
                ("5 Place du Capitole, 31000 Toulouse", "FRANCE"),
                ("30 Quai des Antiques, 13002 Marseille", "FRANCE"),
                ("14 Place Kléber, 67000 Strasbourg", "FRANCE"),
                ("7 Place Stanislas, 54000 Nancy", "FRANCE"),
                ("18 Rue Nationale, 37000 Tours", "FRANCE"),
                ("42 Cours de l'Intendance, 33000 Bordeaux", "FRANCE"),
                ("8 Place de la Comédie, 34000 Montpellier", "FRANCE"),
                ("16 Rue Jeanne d'Arc, 45000 Orléans", "FRANCE"),
            ]

            # Add some DOM-TOM addresses
            dom_tom_addresses = [
                ("Centre-ville, 97110 Pointe-à-Pitre, Guadeloupe", "FRANCE"),
                ("Rue Victor Hugo, 97200 Fort-de-France, Martinique", "FRANCE"),
                ("Boulevard Roland Garros, 97400 Saint-Denis, Réunion", "FRANCE"),
                ("Place des Palmistes, 97300 Cayenne, Guyane", "FRANCE"),
                ("Kawéni, 97600 Mamoudzou, Mayotte", "FRANCE"),
                ("Anse Vata, 98800 Nouméa, Nouvelle-Calédonie", "FRANCE"),
                ("Fare Ute, 98714 Papeete, Polynésie française", "FRANCE"),
                ("Mata-Utu, 98600 Wallis-et-Futuna", "FRANCE"),
            ]

            all_addresses.extend(french_addresses)
            all_addresses.extend(dom_tom_addresses)

        except Exception as e:
            logging.warning(f"Could not download French addresses: {e}")

        # Add international addresses
        international_addresses = [
            ("123 Main Street, New York, NY, USA", "FOREIGN"),
            ("456 Oxford Street, London, UK", "FOREIGN"),
            ("789 Via del Corso, Roma, Italy", "FOREIGN"),
            ("101 Unter den Linden, Berlin, Germany", "FOREIGN"),
            ("202 Calle Mayor, Madrid, Spain", "FOREIGN"),
            ("303 Dam Square, Amsterdam, Netherlands", "FOREIGN"),
            ("404 Bahnhofstrasse, Zurich, Switzerland", "FOREIGN"),
            ("505 Red Square, Moscow, Russia", "FOREIGN"),
            ("606 Times Square, New York, USA", "FOREIGN"),
            ("707 Piccadilly Circus, London, UK", "FOREIGN"),
            ("808 Alexanderplatz, Berlin, Germany", "FOREIGN"),
            ("909 Plaza Mayor, Madrid, Spain", "FOREIGN"),
            ("111 Central Park, New York, USA", "FOREIGN"),
            ("222 Hyde Park, London, UK", "FOREIGN"),
            ("333 Villa Borghese, Rome, Italy", "FOREIGN"),
            ("444 Tiergarten, Berlin, Germany", "FOREIGN"),
            ("555 Retiro Park, Madrid, Spain", "FOREIGN"),
            ("666 Vondelpark, Amsterdam, Netherlands", "FOREIGN"),
            ("777 Regent Street, London, UK", "FOREIGN"),
            ("888 Fifth Avenue, New York, USA", "FOREIGN"),
            ("Shibuya Crossing, Tokyo, Japan", "FOREIGN"),
            ("Sydney Opera House, Sydney, Australia", "FOREIGN"),
            ("CN Tower, Toronto, Canada", "FOREIGN"),
            ("Table Mountain, Cape Town, South Africa", "FOREIGN"),
            ("Christ the Redeemer, Rio de Janeiro, Brazil", "FOREIGN"),
            ("Machu Picchu, Cusco, Peru", "FOREIGN"),
            ("Angkor Wat, Siem Reap, Cambodia", "FOREIGN"),
            ("Taj Mahal, Agra, India", "FOREIGN"),
            ("Great Wall, Beijing, China", "FOREIGN"),
            ("Kremlin, Moscow, Russia", "FOREIGN"),
        ]

        all_addresses.extend(international_addresses)

        # Shuffle and balance the dataset
        random.shuffle(all_addresses)

        # Count by category
        france_addresses = [addr for addr in all_addresses if addr[1] == "FRANCE"]
        foreign_addresses = [addr for addr in all_addresses if addr[1] == "FOREIGN"]

        # Balance the dataset
        max_per_category = min(len(france_addresses), len(foreign_addresses), size_per_category)

        balanced_addresses = []
        balanced_addresses.extend(france_addresses[:max_per_category])
        balanced_addresses.extend(foreign_addresses[:max_per_category])

        # Shuffle final dataset
        random.shuffle(balanced_addresses)

        # Save to CSV
        output_file = os.path.join(self.output_dir, f"{name}.csv")
        with open(output_file, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(['address', 'expected_label', 'index'])
            for i, (address, label) in enumerate(balanced_addresses):
                writer.writerow([address, label, i])

        logging.info(f"Created test dataset: {output_file}")
        logging.info(f"Total addresses: {len(balanced_addresses)}")
        logging.info(f"France addresses: {len([a for a in balanced_addresses if a[1] == 'FRANCE'])}")
        logging.info(f"Foreign addresses: {len([a for a in balanced_addresses if a[1] == 'FOREIGN'])}")

        return output_file

    def create_all_datasets(self):
        """Create all test datasets."""
        datasets = {
            'comprehensive_test': 500,
            'quick_test': 50,
            'large_test': 1000
        }

        created_files = []
        for name, size in datasets.items():
            try:
                file_path = self.create_test_dataset(name, size)
                created_files.append(file_path)
            except Exception as e:
                logging.error(f"Failed to create dataset {name}: {e}")

        return created_files


def setup_logging():
    """Setup logging configuration."""
    log_format = '%(asctime)s - %(levelname)s - %(message)s'

    # Ensure logs directory exists
    logs_dir = os.path.join(os.path.dirname(__file__), 'logs')
    os.makedirs(logs_dir, exist_ok=True)

    log_file = os.path.join(logs_dir, f'dataset_builder_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log')

    logging.basicConfig(
        level=logging.INFO,
        format=log_format,
        handlers=[
            logging.FileHandler(log_file),
            logging.StreamHandler(sys.stdout)
        ]
    )


def main():
    """Main function."""
    parser = argparse.ArgumentParser(
        description="Build comprehensive test datasets from open data sources"
    )
    parser.add_argument(
        '--dataset',
        choices=['comprehensive_test', 'quick_test', 'large_test', 'all'],
        default='all',
        help='Which dataset to create'
    )
    parser.add_argument(
        '--size',
        type=int,
        default=500,
        help='Number of addresses per category (France/Foreign)'
    )

    args = parser.parse_args()

    # Setup logging
    setup_logging()

    logging.info("Starting dataset builder")

    # Initialize builder
    builder = AddressDatasetBuilder()

    try:
        if args.dataset == 'all':
            created_files = builder.create_all_datasets()
        else:
            created_files = [builder.create_test_dataset(args.dataset, args.size)]

        print("\n" + "="*60)
        print("DATASET CREATION SUMMARY")
        print("="*60)
        for file_path in created_files:
            if os.path.exists(file_path):
                with open(file_path, 'r', encoding='utf-8') as f:
                    line_count = sum(1 for line in f) - 1  # Subtract header
                print(f"✅ {os.path.basename(file_path)}: {line_count} addresses")
            else:
                print(f"❌ Failed to create: {os.path.basename(file_path)}")
        print("="*60)

    except KeyboardInterrupt:
        logging.info("Dataset building interrupted by user")
    except Exception as e:
        logging.error(f"Dataset building failed: {e}")
        sys.exit(1)

    logging.info("Dataset building completed")


if __name__ == "__main__":
    main()