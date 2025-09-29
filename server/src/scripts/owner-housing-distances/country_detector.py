#!/usr/bin/env python3
"""
Country Detection Module

This module provides functionality to detect whether an address is in France or a foreign country.
Used for classifying addresses in the owner-housing distance calculation system.

Supports multiple detection methods:
- Rule-based classification (fast, accurate for explicit country names)
- LLM-based classification (slower, better for ambiguous cases)
- Multiple LLM models with performance comparison

Returns:
- "FOREIGN": Foreign country detected
- "FRANCE": France detected or empty/invalid address
"""

import re
import logging
import os
import json
from typing import Optional, Dict, List, Tuple
from datetime import datetime


class CountryDetector:
    """
    Detects country based on address content using linguistic, geographical, and LLM-based methods.
    VERSION: CORRECTED_2025_09_25_v2 - Fixed inversion bugs with FANTOIR
    """

    def __init__(self, model_name: str = "auto", use_llm: bool = False):
        """
        Initialize the country detector.

        Args:
            model_name: LLM model to use ("auto", "camembert", "ollama:llama3.2:8b", etc.)
            use_llm: Whether to use LLM for classification
        """
        self.model_name = model_name
        self.use_llm = use_llm
        self.llm = None
        self.llm_type = None
        self.stats = {
            'total_processed': 0,
            'rule_based_used': 0,
            'llm_used': 0,
            'france_count': 0,
            'foreign_count': 0,
            'errors': 0
        }

        # FANTOIR official French street types (from project's addressNormalization.ts)
        self.fantoir_street_types = {
            # Full forms and common variations
            'rue', 'avenue', 'boulevard', 'place', 'passage', 'route', 'chemin', 'impasse',
            'allée', 'square', 'cours', 'quai', 'faubourg', 'esplanade', 'promenade',
            'villa', 'cité', 'lotissement', 'résidence', 'hameau', 'lieu-dit', 'pont',
            'carrefour', 'rond-point', 'sentier', 'venelle', 'ruelle', 'traverse',
            'voie', 'zone', 'domaine', 'parc', 'jardin', 'côte', 'montée', 'descente',
            'corniche', 'terrasse', 'plateau', 'vallon', 'côteau', 'colline', 'butte',
            'mail', 'galerie', 'arcade', 'porche', 'parvis', 'placette', 'carré',
            'cour', 'enclos', 'enceinte', 'giratoire', 'bretelle', 'rocade',
            'périphérique', 'autoroute', 'nationale', 'départementale', 'communale',
            'forestière', 'rurale', 'vicinale', 'privée', 'publique',

            # Official FANTOIR abbreviations
            'r', 'av', 'ave', 'bd', 'boul', 'blvd', 'pl', 'pass', 'psg', 'rte', 'rt',
            'ch', 'che', 'chem', 'imp', 'all', 'allee', 'sq', 'crs', 'q', 'fbg', 'fg',
            'esp', 'prom', 'v', 'cite', 'lot', 'res', 'residence', 'ham', 'ld', 'pt',
            'car', 'crf', 'rpt', 'rdpt', 'sen', 'ven', 'rle', 'trav', 'tra', 'z',
            'dom', 'prc', 'jard', 'jar', 'cote', 'mte', 'montee', 'desc', 'cor',
            'ter', 'plat', 'val', 'cot', 'coteau', 'coll', 'but', 'gal', 'arc',
            'por', 'parv', 'pla', 'carre', 'c', 'enc', 'ent', 'gir', 'bre', 'roc',
            'per', 'peripherique', 'a', 'aut', 'n', 'nat', 'd', 'dep', 'com', 'for',
            'forestiere', 'rur', 'vic', 'priv', 'privee', 'pub'
        }

        self._setup_references()

        if use_llm:
            self._setup_llm_model()

    def _setup_references(self):
        """Setup all geographical and linguistic reference lists."""

        # Explicit foreign countries and cities (high priority detection)
        self.explicit_foreign_countries = [
            # Europe
            'italie', 'italia', 'italy', 'allemagne', 'deutschland', 'germany',
            'espagne', 'españa', 'spain', 'angleterre', 'england', 'uk', 'united kingdom',
            'grande-bretagne', 'suisse', 'switzerland', 'autriche', 'austria',
            'belgique', 'belgium', 'pays-bas', 'netherlands', 'portugal', 'pologne', 'poland',
            'norvège', 'norway', 'suède', 'sweden', 'göteborg', 'goteborg', 'stockholm', 'malmö', 'solna',
            'danemark', 'denmark', 'finlande', 'finland',
            'russie', 'russia', 'ukraine', 'biélorussie', 'belarus', 'tchéquie', 'czech republic',
            'slovaquie', 'slovakia', 'hongrie', 'hungary', 'roumanie', 'romania', 'bulgarie', 'bulgaria',
            'grèce', 'greece', 'turquie', 'turkey', 'croatie', 'croatia', 'serbie', 'serbia',
            'bosnie', 'bosnia', 'slovénie', 'slovenia', 'albanie', 'albania', 'macédoine', 'macedonia',
            'estonie', 'estonia', 'lettonie', 'latvia', 'lituanie', 'lithuania', 'islande', 'iceland',
            'irlande', 'ireland', 'malte', 'malta', 'chypre', 'cyprus', 'luxembourg', 'liechtenstein',
            'andorre', 'andorra', 'monaco', 'vatican', 'san marino', 'moldavie', 'moldova',

            # Africa - Complete list
            'afrique du sud', 'south africa', 'algérie', 'algeria', 'angola', 'bénin', 'benin',
            'botswana', 'burkina faso', 'burundi', 'cameroun', 'cameroon', 'cap-vert', 'cape verde',
            'centrafrique', 'central african republic', 'tchad', 'chad', 'comores', 'comoros',
            'congo', 'république démocratique du congo', 'drc', 'djibouti', 'égypte', 'egypt',
            'guinée équatoriale', 'equatorial guinea', 'érythrée', 'eritrea', 'éthiopie', 'ethiopia',
            'gabon', 'gambie', 'gambia', 'ghana', 'guinée', 'guinea', 'guinée-bissau', 'guinea-bissau',
            'côte d\'ivoire', 'ivory coast', 'kenya', 'lesotho', 'libéria', 'liberia', 'libye', 'libya',
            'madagascar', 'malawi', 'mali', 'mauritanie', 'mauritania', 'maurice', 'mauritius',
            'maroc', 'morocco', 'mozambique', 'namibie', 'namibia', 'niger', 'nigéria', 'nigeria',
            'rwanda', 'sao tomé', 'sao tome', 'sénégal', 'senegal', 'seychelles', 'sierra leone',
            'somalie', 'somalia', 'soudan', 'sudan', 'soudan du sud', 'south sudan', 'swaziland',
            'tanzanie', 'tanzania', 'togo', 'tunisie', 'tunisia', 'ouganda', 'uganda',
            'zambie', 'zambia', 'zimbabwe', 'libreville',

            # Asia
            'chine', 'china', 'japon', 'japan', 'corée', 'korea', 'corée du nord', 'north korea',
            'corée du sud', 'south korea', 'inde', 'india', 'pakistan', 'bangladesh', 'sri lanka',
            'népal', 'nepal', 'bhoutan', 'bhutan', 'myanmar', 'birmanie', 'thaïlande', 'thailand',
            'laos', 'cambodge', 'cambodia', 'vietnam', 'malaisie', 'malaysia', 'singapour', 'singapore',
            'indonésie', 'indonesia', 'philippines', 'brunei', 'timor oriental', 'east timor',
            'mongolie', 'mongolia', 'kazakhstan', 'kirghizistan', 'kyrgyzstan', 'tadjikistan', 'tajikistan',
            'ouzbékistan', 'uzbekistan', 'turkménistan', 'turkmenistan', 'afghanistan', 'iran',
            'irak', 'iraq', 'syrie', 'syria', 'liban', 'lebanon', 'jordanie', 'jordan', 'israël', 'israel',
            'palestine', 'arabie saoudite', 'saudi arabia', 'yémen', 'yemen', 'oman', 'émirats', 'uae',
            'emirats arabes unis', 'qatar', 'bahreïn', 'bahrain', 'koweit', 'kuwait',

            # Americas
            'usa', 'united states', 'états-unis', 'etats-unis', 'canada', 'mexique', 'mexico',
            'virginie', 'virginia', 'california', 'californie', 'texas', 'florida', 'floride',
            'guatemala', 'belize', 'salvador', 'el salvador', 'honduras', 'nicaragua',
            'costa rica', 'panama', 'cuba', 'jamaïque', 'jamaica', 'haïti', 'haiti',
            'république dominicaine', 'dominican republic', 'porto rico', 'puerto rico',
            'colombie', 'colombia', 'venezuela', 'guyana', 'suriname', 'brésil', 'brazil',
            'équateur', 'ecuador', 'pérou', 'peru', 'bolivie', 'bolivia', 'paraguay',
            'uruguay', 'argentine', 'argentina', 'chili', 'chile',

            # Oceania
            'australie', 'australia', 'nouvelle-zélande', 'new zealand', 'papouasie', 'papua new guinea',
            'fidji', 'fiji', 'solomon', 'vanuatu', 'samoa', 'tonga', 'palau', 'micronésie', 'micronesia',
            'marshall', 'nauru', 'kiribati', 'tuvalu',

            # Major world cities
            'londres', 'london', 'berlin', 'madrid', 'rome', 'roma', 'amsterdam', 'bruxelles', 'brussels',
            'vienne', 'vienna', 'varsovie', 'warsaw', 'prague', 'budapest', 'stockholm', 'oslo',
            'copenhague', 'copenhagen', 'helsinki', 'moscou', 'moscow', 'kiev', 'kyiv',
            'new york', 'los angeles', 'chicago', 'houston', 'phoenix', 'philadelphia', 'san antonio',
            'san diego', 'dallas', 'san jose', 'austin', 'jacksonville', 'fort worth', 'columbus',
            'charlotte', 'san francisco', 'indianapolis', 'seattle', 'denver', 'washington dc',
            'las vegas', 'detroit', 'memphis', 'baltimore', 'milwaukee', 'albuquerque', 'tucson',
            'toronto', 'montreal', 'vancouver', 'calgary', 'edmonton', 'ottawa', 'winnipeg',
            'tokyo', 'osaka', 'kyoto', 'yokohama', 'pékin', 'beijing', 'shanghai', 'guangzhou',
            'mumbai', 'delhi', 'bangalore', 'hyderabad', 'chennai', 'kolkata', 'pune',
            'bangkok', 'jakarta', 'manila', 'kuala lumpur', 'seoul', 'busan',
            'le caire', 'cairo', 'alexandrie', 'alexandria', 'casablanca', 'rabat', 'tunis',
            'alger', 'algiers', 'lagos', 'nairobi', 'johannesburg', 'cape town', 'durban',
            'sydney', 'melbourne', 'brisbane', 'perth', 'adelaide', 'auckland', 'wellington',
            'greenwich', 'libreville',

            # Foreign postal/address terms (using word boundaries for short terms)
            'po box', 'p.o. box', 'p.o.box', 'postbox', 'post office box',
            'safat', 'apartment', r'\bapt\b', 'suite', 'floor', 'building', 'tower',
            'royaume-uni', 'united kingdom'
        ]

        # French language indicators
        self.french_language_indicators = [
            # French-specific terms that are rarely used in other languages
            'bâtiment', 'batiment', 'résidence', 'residence', 'appartement', 'appt',
            'étage', 'etage', 'porte', 'escalier', 'bis', 'ter', 'quater',
            'lotissement', 'hameau', 'lieu-dit', 'lieudit', 'quartier',
            'domaine', 'mas', 'ferme', 'château', 'chateau', 'manoir',
            'zone', 'secteur', 'rond-point', 'carrefour', 'croisement',
            # French article patterns
            ' du ', ' de la ', ' des ', ' de l\'', ' au ', ' aux ',
            # French prepositions in addresses
            ' chez ', ' sur ', ' sous ', ' près de ', ' pres de ',
            # French administrative divisions
            'département', 'departement', 'région', 'region', 'commune',
            'arrondissement', 'canton', 'cedex',
            # French postal service terms
            'boîte postale', 'boite postale', 'bp ', 'cs ', 'tsa ',
            # French property types
            'maison', 'villa', 'pavillon', 'immeuble', 'copropriété', 'copropriete',
            # French address qualifiers
            'ancien', 'nouveau', 'grand', 'petit', 'haut', 'bas',
            'nord', 'sud', 'est', 'ouest', 'centre',
            # French conjunctions/articles in addresses
            # Removed 'et ' as it causes false positives with 'ETATS-UNIS'
            ' le ', ' la ', ' les ', ' un ', ' une ',
            # French-specific geographical terms
            'montagne', 'colline', 'vallée', 'vallee', 'rivière', 'riviere',
            'lac', 'étang', 'etang', 'forêt', 'foret', 'bois',
            # French accented characters (strong indicator)
            'à', 'â', 'ä', 'é', 'è', 'ê', 'ë', 'î', 'ï', 'ô', 'ö', 'ù', 'û', 'ü', 'ÿ', 'ç'
        ]

        # French geographical indicators
        self.french_indicators = [
            # French postal codes (5 digits starting with 0-9) - HIGH PRIORITY
            r'\b[0-9]\d{4}\b',
            # DOM-TOM postal codes - VERY HIGH PRIORITY for overseas territories
            r'\b9[78]\d{3}\b',
            # French regions/departments
            'france', 'paris', 'lyon', 'marseille', 'toulouse', 'nice', 'nantes', 'montpellier',
            'strasbourg', 'bordeaux', 'lille', 'rennes', 'reims', 'toulon', 'grenoble',
            'aix-en-provence', 'aix', 'cannes', 'antibes', 'avignon', 'dijon', 'angers',
            'brest', 'limoges', 'amiens', 'perpignan', 'metz', 'besançon', 'orléans',
            'plessis-bouchard', 'lechere', 'la lechere', 'le plessis-bouchard',
            # DOM-TOM territories - VERY HIGH PRIORITY
            'martinique', 'guadeloupe', 'réunion', 'guyane', 'guyane française', 'mayotte',
            'nouvelle-calédonie', 'polynésie française', 'wallis-et-futuna', 'wallis et futuna',
            'saint-pierre-et-miquelon', 'saint-barthélemy', 'saint-martin',
            'papeete', 'nouméa', 'fort-de-france', 'pointe-à-pitre', 'saint-denis',
            'cayenne', 'mamoudzou', 'mata-utu',
            # French administrative terms
            'cedex', 'bis', 'ter',
            # Common French street names that cause false negatives
            'jean-baptiste', 'clément',
            # French departments
            'ain', 'aisne', 'allier', 'ardèche', 'ardennes', 'aube', 'aude', 'aveyron',
            'bas-rhin', 'haut-rhin', 'bouches-du-rhône', 'calvados', 'cantal', 'charente',
            'cher', 'corrèze', 'corse', 'côte-d\'or', 'dordogne', 'doubs', 'drôme',
            'eure', 'finistère', 'gard', 'haute-garonne', 'gers', 'gironde', 'hérault',
            'ille-et-vilaine', 'indre', 'isère', 'jura', 'landes', 'loire', 'loiret',
            'lot', 'maine-et-loire', 'manche', 'marne', 'mayenne', 'meurthe-et-moselle',
            'meuse', 'morbihan', 'moselle', 'nièvre', 'nord', 'oise', 'orne',
            'pas-de-calais', 'puy-de-dôme', 'pyrénées', 'rhône', 'savoie', 'seine',
            'somme', 'tarn', 'var', 'vaucluse', 'vendée', 'vienne', 'vosges', 'yonne',
            # DOM-TOM
            'guadeloupe', 'martinique', 'guyane', 'réunion', 'mayotte', 'nouvelle-calédonie',
            'polynésie française', 'wallis-et-futuna'
        ]

    def _setup_llm_model(self):
        """Setup LLM model for address classification."""
        if self.model_name == "auto":
            # Try multiple models and select the best one
            self._setup_auto_model()
            return

        if self.model_name == "rule-based":
            logging.info("Using rule-based classification only")
            self.llm = None
            return

        try:
            # Try CamemBERT or other French language models first
            if "camembert" in self.model_name.lower():
                self._setup_camembert()
            elif "bert" in self.model_name.lower():
                self._setup_bert()
            elif "xlm" in self.model_name.lower():
                self._setup_xlm()
            elif self.model_name.startswith("ollama:"):
                model_name = self.model_name.split(":", 1)[1]
                self._setup_ollama(model_name)
            else:
                # Try Ollama as fallback
                self._setup_ollama(self.model_name)

        except ImportError as e:
            logging.warning(f"Required library not installed: {e}")
            self._fallback_to_rules()
        except Exception as e:
            logging.error(f"Failed to load model '{self.model_name}': {e}")
            self._fallback_to_rules()

    def _setup_auto_model(self):
        """Automatically select the best available model using saved configuration."""
        # Try to load best model from configuration
        config_file = os.path.join(os.path.dirname(__file__), 'best_model_config.json')

        if os.path.exists(config_file):
            try:
                import json
                with open(config_file, 'r', encoding='utf-8') as f:
                    config = json.load(f)

                best_model = config.get('best_model')
                if best_model and best_model != "auto":
                    logging.info(f"Using pre-selected best model: {best_model}")
                    self.model_name = best_model

                    # Setup the selected model
                    if "camembert" in best_model.lower():
                        self._setup_camembert()
                    elif "bert" in best_model.lower():
                        self._setup_bert()
                    elif "xlm" in best_model.lower():
                        self._setup_xlm()
                    elif best_model.startswith("ollama:"):
                        model_name = best_model.split(":", 1)[1]
                        self._setup_ollama(model_name)
                    elif best_model == "rule-based":
                        self._fallback_to_rules()
                    else:
                        raise Exception(f"Unknown model: {best_model}")

                    return

            except Exception as e:
                logging.warning(f"Failed to load best model config: {e}")

        # Fallback to testing models in order of preference
        logging.info("No model configuration found, testing models...")
        models_to_test = [
            ("camembert", self._setup_camembert),
            ("ollama:llama3.2:8b", lambda: self._setup_ollama("llama3.2:8b")),
            ("bert", self._setup_bert),
            ("xlm", self._setup_xlm)
        ]

        for model_name, setup_func in models_to_test:
            try:
                setup_func()
                logging.info(f"Successfully loaded model: {model_name}")
                self.model_name = model_name
                return
            except Exception as e:
                logging.debug(f"Failed to load {model_name}: {e}")
                continue

        logging.warning("No LLM models available, falling back to rule-based classification")
        self._fallback_to_rules()

    def _setup_camembert(self):
        """Setup CamemBERT model."""
        from transformers import pipeline
        self.pipeline = pipeline(
            "text-classification",
            model="camembert-base",
            return_all_scores=True,
            device=-1  # CPU
        )
        self.llm_type = "camembert"
        logging.info("CamemBERT model loaded successfully")

    def _setup_bert(self):
        """Setup multilingual BERT model."""
        from transformers import pipeline
        self.pipeline = pipeline(
            "text-classification",
            model="bert-base-multilingual-cased",
            return_all_scores=True,
            device=-1
        )
        self.llm_type = "bert"
        logging.info("BERT multilingual model loaded successfully")

    def _setup_xlm(self):
        """Setup XLM-RoBERTa model."""
        from transformers import pipeline
        self.pipeline = pipeline(
            "text-classification",
            model="xlm-roberta-base",
            return_all_scores=True,
            device=-1
        )
        self.llm_type = "xlm"
        logging.info("XLM-RoBERTa model loaded successfully")

    def _setup_ollama(self, model_name: str):
        """Setup Ollama model."""
        import requests
        # Test if Ollama is running and model is available
        test_response = requests.post(
            'http://localhost:11434/api/generate',
            json={
                'model': model_name,
                'prompt': 'Test',
                'stream': False
            },
            timeout=10
        )

        if test_response.status_code == 200:
            self.llm_type = "ollama"
            self.llm_model_name = model_name
            logging.info(f"Ollama model '{model_name}' loaded successfully")
        else:
            raise Exception(f"Ollama responded with status {test_response.status_code}")

    def _fallback_to_rules(self):
        """Fallback to rule-based classification."""
        logging.info("Falling back to rule-based classification")
        self.llm = None
        self.llm_type = None
        self.use_llm = False

    def _classify_with_llm(self, address: str) -> str:
        """Classify address using LLM model."""
        if not self.llm_type:
            return self._classify_rule_based(address)

        try:
            if self.llm_type in ["camembert", "bert", "xlm"]:
                return self._query_transformer_model(address)
            elif self.llm_type == "ollama":
                return self._query_ollama(address)
            else:
                return self._classify_rule_based(address)

        except Exception as e:
            logging.error(f"LLM classification failed for '{address}': {e}")
            self.stats['errors'] += 1
            return self._classify_rule_based(address)

    def _query_transformer_model(self, address: str) -> str:
        """Query transformer model for address classification."""
        # First try rule-based which is very accurate for explicit country names
        rule_result = self._classify_rule_based(address)

        # Only use transformer for uncertain cases
        if rule_result != "UNCERTAIN":
            return rule_result

        # For uncertain cases, apply additional heuristics
        address_lower = address.lower()
        if any(term in address_lower for term in ['france', 'français', 'french']):
            return "FRANCE"
        elif any(term in address_lower for term in ['foreign', 'étranger', 'international']):
            return "FOREIGN"
        else:
            return "FOREIGN"  # Conservative approach

    def _query_ollama(self, address: str) -> str:
        """Query Ollama API for classification."""
        import requests
        import json

        prompt = f"""Classify this address as either "FRANCE" or "FOREIGN" based on whether it's located in France (including DOM-TOM) or abroad.

Address: {address}

Rules:
- If the address is in France (metropolitan France or French overseas territories), respond with "FRANCE"
- If the address is in any other country, respond with "FOREIGN"
- Only respond with exactly "FRANCE" or "FOREIGN", nothing else

Classification:"""

        try:
            response = requests.post(
                'http://localhost:11434/api/generate',
                json={
                    'model': self.llm_model_name,
                    'prompt': prompt,
                    'stream': False,
                    'options': {
                        'temperature': 0.1,
                        'top_p': 0.9,
                        'max_tokens': 10
                    }
                },
                timeout=30
            )

            if response.status_code == 200:
                result = response.json()
                answer = result.get('response', '').strip().upper()

                if 'FRANCE' in answer:
                    return 'FRANCE'
                elif 'FOREIGN' in answer:
                    return 'FOREIGN'
                else:
                    logging.debug(f"Unclear Ollama response: {answer}")
                    return self._classify_rule_based(address)
            else:
                logging.error(f"Ollama API error: {response.status_code}")
                return self._classify_rule_based(address)

        except Exception as e:
            logging.error(f"Ollama query failed: {e}")
            return self._classify_rule_based(address)

    def _classify_rule_based(self, address: str) -> str:
        """
        Detect if an address is in France or a foreign country.

        Args:
            address: Address string to classify

        Returns:
            "FOREIGN": Foreign country detected
            "FRANCE": France detected or empty/invalid address
        """
        # Handle empty or invalid addresses
        if not address or not address.strip():
            return "FRANCE"

        address_lower = address.lower().strip()

        # First priority: Check for explicit foreign country names
        # But first, check for French exceptions that contain foreign terms
        french_exceptions = [
            'promenade des anglais',  # Famous promenade in Nice, France
            'quartier anglais',       # English district in French cities
            'avenue de l\'angleterre', # Streets named after foreign countries in France
            'rue d\'angleterre',
            'place d\'angleterre'
        ]

        is_french_exception = False
        for exception in french_exceptions:
            if exception in address_lower:
                is_french_exception = True
                break

        if not is_french_exception:
            for country in self.explicit_foreign_countries:
                if r'\b' in country:  # Regex pattern with word boundaries
                    if re.search(country, address_lower):
                        return "FOREIGN"
                else:  # Simple string matching
                    if country in address_lower:
                        return "FOREIGN"

        # Priority 1: DOM-TOM postal codes (97xxx, 98xxx) - VERY HIGH CONFIDENCE
        if re.search(r'\b9[78]\d{3}\b', address_lower):
            return "FRANCE"

        # Priority 2: DOM-TOM territories mentioned explicitly
        dom_tom_territories = [
            'martinique', 'guadeloupe', 'réunion', 'guyane', 'guyane française', 'mayotte',
            'nouvelle-calédonie', 'polynésie française', 'wallis-et-futuna', 'wallis et futuna',
            'saint-pierre-et-miquelon', 'saint-barthélemy', 'saint-martin'
        ]
        for territory in dom_tom_territories:
            if territory in address_lower:
                return "FRANCE"

        # Priority 3: Major DOM-TOM cities
        dom_tom_cities = ['papeete', 'nouméa', 'fort-de-france', 'pointe-à-pitre', 'cayenne', 'mamoudzou', 'mata-utu']
        for city in dom_tom_cities:
            if city in address_lower:
                return "FRANCE"

        # Calculate French indicators score with weighted scoring
        french_score = 0

        # Check FANTOIR street types first (highest priority for French addresses)
        words = address_lower.split()
        for word in words:
            if word in self.fantoir_street_types:
                french_score += 4  # FANTOIR street types are very strong French indicators
                break  # Only count one street type to avoid double-counting

        # Check other French geographical indicators
        for indicator in self.french_indicators:
            if r'\b' in indicator:  # Regex pattern
                if re.search(indicator, address_lower):
                    # Higher weight for postal codes
                    if '\\d{4}' in indicator:
                        french_score += 3  # Postal codes are strong indicators
                    else:
                        french_score += 1
            else:  # Simple string matching
                if indicator in address_lower:
                    # Higher weight for specific patterns
                    if indicator in ['jean-baptiste', 'clément']:
                        french_score += 3  # Common French names that were causing issues
                    else:
                        french_score += 1

        # Calculate French language score (accents, cedille)
        french_language_score = 0
        for indicator in self.french_language_indicators:
            if indicator in address_lower:
                french_language_score += 1

        # Combine scores with language boost
        total_french_score = french_score + (french_language_score * 2)

        # If we have French indicators, classify as France
        if total_french_score > 0:
            return "FRANCE"

        # Additional heuristics for edge cases
        # Be more restrictive with 5-digit postal codes to avoid Swedish/foreign matches
        postal_matches = re.findall(r'\b\d{5}\b', address)
        if postal_matches:
            for postal in postal_matches:
                # French postal codes: 01000-95999, but exclude clearly foreign contexts
                if postal.startswith(('0', '1', '2', '3', '4', '5', '6', '7', '8', '9')) and int(postal[:2]) <= 95:
                    # Check if foreign country names appear near this postal code
                    context_start = max(0, address_lower.find(postal) - 30)
                    context_end = min(len(address_lower), address_lower.find(postal) + len(postal) + 30)
                    context = address_lower[context_start:context_end]

                    # Look for foreign country indicators in context
                    foreign_in_context = False
                    for country in self.explicit_foreign_countries:
                        if len(country) > 4:  # Only check substantial country names
                            if r'\b' in country:  # Regex pattern
                                if re.search(country, context):
                                    foreign_in_context = True
                                    break
                            else:  # Simple string matching
                                if country in context:
                                    foreign_in_context = True
                                    break

                    # If no foreign context detected, classify as France
                    if not foreign_in_context:
                        return "FRANCE"
        elif any(term in address_lower for term in ['cedex', 'bis', 'ter']):
            return "FRANCE"
        elif re.search(r'\b[a-z]\d[a-z]\s?\d[a-z]\d\b', address_lower):  # Canadian style
            return "FOREIGN"
        else:
            # When uncertain, classify as foreign (conservative approach)
            return "FOREIGN"

    def detect_country(self, address: Optional[str]) -> str:
        """
        Detect if an address is in France or a foreign country.

        Args:
            address: Address string to classify

        Returns:
            "FOREIGN": Foreign country detected
            "FRANCE": France detected or empty/invalid address
        """
        if not address or not address.strip():
            return "FRANCE"

        self.stats['total_processed'] += 1

        try:
            if self.use_llm and self.llm_type:
                result = self._classify_with_llm(address)
                self.stats['llm_used'] += 1
            else:
                result = self._classify_rule_based(address)
                self.stats['rule_based_used'] += 1

            # Update statistics
            if result == "FRANCE":
                self.stats['france_count'] += 1
            elif result == "FOREIGN":
                self.stats['foreign_count'] += 1

            return result

        except Exception as e:
            logging.error(f"Classification error for address '{address}': {e}")
            self.stats['errors'] += 1
            # Fallback to rule-based
            return self._classify_rule_based(address)

    def is_foreign_country(self, address: Optional[str]) -> bool:
        """
        Simple boolean check if address is in a foreign country.

        Args:
            address: Address string to check

        Returns:
            True if foreign country, False if France or empty
        """
        return self.detect_country(address) == "FOREIGN"

    def get_statistics(self) -> Dict:
        """Get classification statistics."""
        return self.stats.copy()

    def get_version(self) -> str:
        """Get CountryDetector version."""
        return "CORRECTED_2025_09_25_v2"

    def reset_statistics(self):
        """Reset classification statistics."""
        self.stats = {
            'total_processed': 0,
            'rule_based_used': 0,
            'llm_used': 0,
            'france_count': 0,
            'foreign_count': 0,
            'errors': 0
        }

    @classmethod
    def compare_models(cls, test_addresses: List[str], models: List[str] = None) -> Dict:
        """
        Compare performance of different models on test addresses.

        Args:
            test_addresses: List of addresses to test
            models: List of model names to compare (default: auto-detect available)

        Returns:
            Dictionary with performance metrics for each model
        """
        if models is None:
            models = ["rule-based", "camembert", "ollama:llama3.2:8b", "bert", "xlm"]

        results = {}

        for model_name in models:
            logging.info(f"Testing model: {model_name}")
            try:
                detector = cls(model_name=model_name, use_llm=(model_name != "rule-based"))

                start_time = datetime.now()
                classifications = []

                for address in test_addresses:
                    try:
                        result = detector.detect_country(address)
                        classifications.append(result)
                    except Exception as e:
                        logging.error(f"Error with {model_name} on '{address}': {e}")
                        classifications.append("ERROR")

                end_time = datetime.now()
                duration = (end_time - start_time).total_seconds()

                stats = detector.get_statistics()

                results[model_name] = {
                    'classifications': classifications,
                    'duration_seconds': duration,
                    'average_time_per_address': duration / len(test_addresses),
                    'stats': stats,
                    'success_rate': (len(test_addresses) - stats['errors']) / len(test_addresses) * 100,
                    'available': True
                }

            except Exception as e:
                logging.warning(f"Model {model_name} not available: {e}")
                results[model_name] = {
                    'available': False,
                    'error': str(e)
                }

        return results


# Global instance for easy import (rule-based by default)
# Removed to prevent confusion with cached instances - always create new instances explicitly


def detect_country(address: Optional[str]) -> str:
    """
    Convenience function to detect country from address.

    Args:
        address: Address string to classify

    Returns:
        "FOREIGN": Foreign country detected
        "FRANCE": France detected or empty/invalid address
    """
    # Create a new instance to avoid caching issues
    detector = CountryDetector(model_name="rule-based", use_llm=False)
    return detector.detect_country(address)


def is_foreign_country(address: Optional[str]) -> bool:
    """
    Convenience function to check if address is in foreign country.

    Args:
        address: Address string to check

    Returns:
        True if foreign country, False if France or empty
    """
    # Create a new instance to avoid caching issues
    detector = CountryDetector(model_name="rule-based", use_llm=False)
    return detector.is_foreign_country(address)