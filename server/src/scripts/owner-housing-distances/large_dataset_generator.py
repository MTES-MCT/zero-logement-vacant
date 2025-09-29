#!/usr/bin/env python3
"""
Large Dataset Generator for Address Classification Testing

Creates large, balanced datasets with realistic addresses for testing.
"""

import argparse
import logging
import sys
import os
import json
import csv
import random
from datetime import datetime
from typing import List, Tuple

# Add the project root to Python path for imports
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', '..'))

class LargeDatasetGenerator:
    """Generates large datasets with realistic address patterns."""

    def __init__(self):
        """Initialize the generator."""
        self.data_dir = os.path.join(os.path.dirname(__file__), 'test_data')
        self.output_dir = os.path.join(self.data_dir, 'datasets')
        os.makedirs(self.output_dir, exist_ok=True)

    def generate_french_addresses(self, count: int) -> List[Tuple[str, str]]:
        """Generate realistic French addresses."""
        addresses = []

        # French street prefixes and names
        prefixes = ['Rue', 'Avenue', 'Boulevard', 'Place', 'Impasse', 'Chemin', 'Allée', 'Square', 'Passage', 'Villa', 'Cité', 'Cours']

        street_names = [
            'de la Paix', 'Victor Hugo', 'Jean Jaurès', 'Charles de Gaulle', 'République',
            'Liberté', 'Égalité', 'Fraternité', 'National', 'du Commerce', 'de la Mairie',
            'de la Gare', 'du Marché', 'de l\'Église', 'du Château', 'de la Fontaine',
            'Jean-Baptiste Clément', 'Pasteur', 'Voltaire', 'Molière', 'Racine',
            'Corneille', 'La Fontaine', 'Descartes', 'Pascal', 'Rousseau', 'Diderot',
            'Montesquieu', 'Balzac', 'Flaubert', 'Zola', 'Proust', 'Camus',
            'de Verdun', 'du 8 Mai 1945', 'du 11 Novembre 1918', 'de la Résistance',
            'des Martyrs', 'de la Libération', 'du Général Leclerc', 'Foch', 'Joffre',
            'des Roses', 'des Lilas', 'des Chênes', 'des Platanes', 'des Tilleuls',
            'Saint-Antoine', 'Saint-Martin', 'Saint-Paul', 'Saint-Pierre', 'Saint-Jean',
            'Notre-Dame', 'Sainte-Catherine', 'Saint-Honoré', 'Saint-Germain'
        ]

        cities = [
            ('Paris', '75001'), ('Lyon', '69001'), ('Marseille', '13001'), ('Toulouse', '31000'),
            ('Nice', '06000'), ('Nantes', '44000'), ('Montpellier', '34000'), ('Strasbourg', '67000'),
            ('Bordeaux', '33000'), ('Lille', '59000'), ('Rennes', '35000'), ('Reims', '51100'),
            ('Saint-Étienne', '42000'), ('Le Havre', '76600'), ('Toulon', '83000'), ('Grenoble', '38000'),
            ('Dijon', '21000'), ('Angers', '49000'), ('Nîmes', '30000'), ('Villeurbanne', '69100'),
            ('Saint-Denis', '93200'), ('Le Mans', '72000'), ('Aix-en-Provence', '13100'),
            ('Clermont-Ferrand', '63000'), ('Brest', '29200'), ('Limoges', '87000'), ('Tours', '37000'),
            ('Amiens', '80000'), ('Perpignan', '66000'), ('Metz', '57000'), ('Besançon', '25000'),
            ('Boulogne-Billancourt', '92100'), ('Orléans', '45000'), ('Mulhouse', '68100'),
            ('Rouen', '76000'), ('Caen', '14000'), ('Nancy', '54000'), ('Saint-Paul', '97460'),
            ('Argenteuil', '95100'), ('Montreuil', '93100'), ('Roubaix', '59100')
        ]

        # DOM-TOM cities
        dom_tom_cities = [
            ('Fort-de-France', '97200', 'Martinique'), ('Pointe-à-Pitre', '97110', 'Guadeloupe'),
            ('Saint-Denis', '97400', 'Réunion'), ('Cayenne', '97300', 'Guyane'),
            ('Mamoudzou', '97600', 'Mayotte'), ('Nouméa', '98800', 'Nouvelle-Calédonie'),
            ('Papeete', '98714', 'Polynésie française'), ('Mata-Utu', '98600', 'Wallis-et-Futuna')
        ]

        for i in range(count):
            # Generate address components
            num = random.randint(1, 999)
            bis_ter = random.choice(['', ' bis', ' ter', ' quater']) if random.random() < 0.1 else ''
            prefix = random.choice(prefixes)
            name = random.choice(street_names)

            # Choose city (90% mainland, 10% DOM-TOM)
            if random.random() < 0.9:
                city, postal = random.choice(cities)
                address = f"{num}{bis_ter} {prefix} {name}, {postal} {city}"
            else:
                city, postal, territory = random.choice(dom_tom_cities)
                address = f"{num}{bis_ter} {prefix} {name}, {postal} {city}, {territory}"

            addresses.append((address, "FRANCE"))

        return addresses

    def generate_foreign_addresses(self, count: int) -> List[Tuple[str, str]]:
        """Generate realistic foreign addresses."""
        addresses = []

        # English-speaking countries
        us_prefixes = ['Street', 'Avenue', 'Road', 'Drive', 'Lane', 'Way', 'Court', 'Place', 'Boulevard', 'Circle']
        us_names = ['Main', 'Oak', 'Elm', 'Park', 'Church', 'School', 'High', 'First', 'Second', 'Third',
                   'Washington', 'Lincoln', 'Jefferson', 'Madison', 'Jackson', 'Martin Luther King Jr',
                   'Broadway', 'Sunset', 'Hollywood', 'Wall', 'Fifth', 'Pennsylvania']

        us_cities = [
            ('New York', 'NY'), ('Los Angeles', 'CA'), ('Chicago', 'IL'), ('Houston', 'TX'),
            ('Phoenix', 'AZ'), ('Philadelphia', 'PA'), ('San Antonio', 'TX'), ('San Diego', 'CA'),
            ('Dallas', 'TX'), ('San Jose', 'CA'), ('Austin', 'TX'), ('Jacksonville', 'FL'),
            ('Fort Worth', 'TX'), ('Columbus', 'OH'), ('Charlotte', 'NC'), ('San Francisco', 'CA'),
            ('Indianapolis', 'IN'), ('Seattle', 'WA'), ('Denver', 'CO'), ('Washington', 'DC')
        ]

        uk_cities = ['London', 'Manchester', 'Birmingham', 'Liverpool', 'Leeds', 'Glasgow', 'Sheffield', 'Edinburgh']
        canadian_cities = ['Toronto', 'Montreal', 'Vancouver', 'Calgary', 'Edmonton', 'Ottawa', 'Winnipeg', 'Quebec City']

        # European countries
        german_cities = ['Berlin', 'Hamburg', 'München', 'Köln', 'Frankfurt', 'Stuttgart', 'Düsseldorf', 'Dortmund']
        italian_cities = ['Roma', 'Milano', 'Napoli', 'Torino', 'Palermo', 'Genova', 'Bologna', 'Firenze']
        spanish_cities = ['Madrid', 'Barcelona', 'Valencia', 'Sevilla', 'Zaragoza', 'Málaga', 'Murcia', 'Palma']

        # Generate diverse foreign addresses
        for i in range(count):
            country_type = random.choice(['usa', 'uk', 'canada', 'germany', 'italy', 'spain', 'other'])

            if country_type == 'usa':
                num = random.randint(1, 9999)
                name = random.choice(us_names)
                prefix = random.choice(us_prefixes)
                city, state = random.choice(us_cities)
                zip_code = f"{random.randint(10000, 99999)}"
                address = f"{num} {name} {prefix}, {city}, {state} {zip_code}, USA"

            elif country_type == 'uk':
                num = random.randint(1, 999)
                name = random.choice(us_names)  # Many similar street names
                prefix = random.choice(['Street', 'Road', 'Avenue', 'Lane', 'Close', 'Gardens'])
                city = random.choice(uk_cities)
                postcode = f"{random.choice(['SW', 'NW', 'SE', 'NE', 'W', 'E'])}{random.randint(1, 20)} {random.randint(1, 9)}{random.choice(['AA', 'AB', 'AC', 'AD'])}"
                address = f"{num} {name} {prefix}, {city} {postcode}, UK"

            elif country_type == 'canada':
                num = random.randint(1, 9999)
                name = random.choice(us_names)
                prefix = random.choice(['Street', 'Avenue', 'Road', 'Drive', 'Boulevard'])
                city = random.choice(canadian_cities)
                postal = f"{random.choice(['K', 'L', 'M', 'N', 'V', 'T'])}{random.randint(1, 9)}{random.choice(['A', 'B', 'C'])} {random.randint(1, 9)}{random.choice(['A', 'B', 'C'])}{random.randint(1, 9)}"
                address = f"{num} {name} {prefix}, {city}, ON {postal}, Canada"

            elif country_type == 'germany':
                name = random.choice(['Hauptstraße', 'Kirchgasse', 'Schulstraße', 'Bahnhofstraße', 'Dorfstraße'])
                num = random.randint(1, 200)
                city = random.choice(german_cities)
                plz = f"{random.randint(10000, 99999)}"
                address = f"{name} {num}, {plz} {city}, Germany"

            elif country_type == 'italy':
                name = random.choice(['Via del Corso', 'Via Roma', 'Via Nazionale', 'Piazza del Duomo', 'Via Garibaldi'])
                num = random.randint(1, 200)
                city = random.choice(italian_cities)
                cap = f"{random.randint(10000, 99999)}"
                address = f"{name} {num}, {cap} {city}, Italy"

            elif country_type == 'spain':
                name = random.choice(['Calle Mayor', 'Avenida Principal', 'Plaza Central', 'Calle Real', 'Paseo de Gracia'])
                num = random.randint(1, 200)
                city = random.choice(spanish_cities)
                cp = f"{random.randint(10000, 99999)}"
                address = f"{name} {num}, {cp} {city}, Spain"

            else:  # other countries
                countries_cities = [
                    ('Tokyo', 'Japan'), ('Beijing', 'China'), ('Mumbai', 'India'),
                    ('São Paulo', 'Brazil'), ('Mexico City', 'Mexico'), ('Lagos', 'Nigeria'),
                    ('Istanbul', 'Turkey'), ('Moscow', 'Russia'), ('Tehran', 'Iran'),
                    ('Bangkok', 'Thailand'), ('Jakarta', 'Indonesia'), ('Seoul', 'South Korea')
                ]
                city, country = random.choice(countries_cities)
                address = f"Building {random.randint(1, 999)}, District {random.randint(1, 20)}, {city}, {country}"

            addresses.append((address, "FOREIGN"))

        return addresses

    def create_large_dataset(self, name: str, size_per_category: int) -> str:
        """Create a large balanced dataset."""
        logging.info(f"Creating large dataset: {name} with {size_per_category} addresses per category")

        # Generate French addresses
        logging.info("Generating French addresses...")
        french_addresses = self.generate_french_addresses(size_per_category)

        # Generate foreign addresses
        logging.info("Generating foreign addresses...")
        foreign_addresses = self.generate_foreign_addresses(size_per_category)

        # Combine and shuffle
        all_addresses = french_addresses + foreign_addresses
        random.shuffle(all_addresses)

        # Save to CSV
        output_file = os.path.join(self.output_dir, f"{name}.csv")
        with open(output_file, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(['address', 'expected_label', 'index'])
            for i, (address, label) in enumerate(all_addresses):
                writer.writerow([address, label, i])

        logging.info(f"Created dataset: {output_file}")
        logging.info(f"Total addresses: {len(all_addresses)}")
        logging.info(f"France addresses: {len(french_addresses)}")
        logging.info(f"Foreign addresses: {len(foreign_addresses)}")

        return output_file


def setup_logging():
    """Setup logging configuration."""
    log_format = '%(asctime)s - %(levelname)s - %(message)s'

    # Ensure logs directory exists
    logs_dir = os.path.join(os.path.dirname(__file__), 'logs')
    os.makedirs(logs_dir, exist_ok=True)

    log_file = os.path.join(logs_dir, f'large_dataset_generator_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log')

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
        description="Generate large test datasets for address classification"
    )
    parser.add_argument(
        '--name',
        default='mega_test',
        help='Dataset name'
    )
    parser.add_argument(
        '--size',
        type=int,
        default=5000,
        help='Number of addresses per category (France/Foreign)'
    )

    args = parser.parse_args()

    # Setup logging
    setup_logging()

    logging.info("Starting large dataset generation")

    # Initialize generator
    generator = LargeDatasetGenerator()

    try:
        # Create the dataset
        output_file = generator.create_large_dataset(args.name, args.size)

        print("\n" + "="*60)
        print("LARGE DATASET CREATION SUMMARY")
        print("="*60)

        if os.path.exists(output_file):
            with open(output_file, 'r', encoding='utf-8') as f:
                line_count = sum(1 for line in f) - 1  # Subtract header
            print(f"✅ {os.path.basename(output_file)}: {line_count:,} addresses")
            print(f"📁 Location: {output_file}")
        else:
            print(f"❌ Failed to create: {args.name}")

        print("="*60)

    except KeyboardInterrupt:
        logging.info("Dataset generation interrupted by user")
    except Exception as e:
        logging.error(f"Dataset generation failed: {e}")
        sys.exit(1)

    logging.info("Large dataset generation completed")


if __name__ == "__main__":
    main()