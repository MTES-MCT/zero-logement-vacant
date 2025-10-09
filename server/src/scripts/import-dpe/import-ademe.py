import requests
import json
import time
import os
from typing import Optional, List, Dict, Any

class AdemeApiClient:
    def __init__(self, api_key: str):
        """
        Initialise le client API ADEME
        
        Args:
            api_key: Clé API pour l'authentification
        """
        self.api_key = api_key
        self.base_url = "https://data.ademe.fr/data-fair/api/v1/datasets/dpe03existant/lines"
        self.headers = {
            "x-apiKey": api_key,
            "Content-Type": "application/json",
            "User-Agent": "Python/ADEME-DPE-Client"
        }
        self.session = requests.Session()
        self.session.headers.update(self.headers)
        
        print(f"🔑 Initialisation avec en-têtes: {self.headers}")
    
    def get_last_record_from_file(self, filename: str) -> Optional[Dict[str, Any]]:
        """
        Récupère le dernier enregistrement d'un fichier JSON Lines
        
        Args:
            filename: Nom du fichier JSON Lines
            
        Returns:
            Dernier enregistrement ou None si le fichier est vide/inexistant
        """
        try:
            if not os.path.exists(filename):
                return None
            
            with open(filename, 'rb') as f:
                # Aller à la fin du fichier
                f.seek(-2, os.SEEK_END)
                
                # Lire vers l'arrière jusqu'à trouver une nouvelle ligne
                while f.read(1) != b'\n':
                    f.seek(-2, os.SEEK_CUR)
                
                # Lire la dernière ligne
                last_line = f.readline().decode('utf-8').strip()
                
                if last_line:
                    return json.loads(last_line)
                    
        except Exception as e:
            print(f"Erreur lors de la lecture du dernier enregistrement: {e}")
            
        return None
    
    def build_resume_url(self, last_record: Dict[str, Any], limit_per_page: int = 10000) -> str:
        """
        Construit l'URL pour reprendre à partir du dernier enregistrement
        
        Args:
            last_record: Dernier enregistrement traité
            limit_per_page: Nombre d'éléments par page
            
        Returns:
            URL avec le paramètre 'after' pour la reprise
        """
        _i = last_record.get("_i", "")
        _rand = last_record.get("_rand", "")
        
        # Construction du paramètre 'after': _i + "%2C" + _rand
        after_param = f"{_i}%2C{_rand}"
        
        return f"{self.base_url}?size={limit_per_page}&after={after_param}"
    
    def count_lines_in_file(self, filename: str) -> int:
        """
        Compte le nombre de lignes dans un fichier
        
        Args:
            filename: Nom du fichier
            
        Returns:
            Nombre de lignes
        """
        try:
            if not os.path.exists(filename):
                return 0
                
            with open(filename, 'r', encoding='utf-8') as f:
                return sum(1 for _ in f)
        except Exception as e:
            print(f"Erreur lors du comptage des lignes: {e}")
            return 0
    
    def test_authentication(self) -> bool:
        """
        Teste l'authentification avec x-apiKey
        
        Returns:
            True si l'authentification réussit, False sinon
        """
        test_url = f"{self.base_url}?size=1"
        
        print(f"🧪 Test d'authentification avec: {dict(self.session.headers)}")
        
        try:
            response = self.session.get(test_url)
            print(f"📊 Status: {response.status_code}")
            
            if response.status_code == 200:
                print("✅ Authentification réussie!")
                return True
            elif response.status_code == 401:
                print("❌ Authentification échouée (401 Unauthorized)")
                print(f"🔍 Response text: {response.text[:500]}")
                return False
            else:
                print(f"⚠️ Status inattendu: {response.status_code}")
                print(f"🔍 Response text: {response.text[:500]}")
                return False
                
        except Exception as e:
            print(f"❌ Erreur lors du test: {e}")
            return False
    
    def get_page(self, url: str) -> Optional[Dict[str, Any]]:
        """
        Récupère une page de données depuis l'API
        
        Args:
            url: URL de la page à récupérer
            
        Returns:
            Dictionnaire contenant les données de la page ou None en cas d'erreur
        """
        try:
            print(f"🌐 Requête: {url}")
            print(f"🔑 En-têtes: {dict(self.session.headers)}")
            
            response = self.session.get(url)
            
            print(f"📊 Status: {response.status_code}")
            if response.status_code == 401:
                print(f"🔍 Response headers: {dict(response.headers)}")
                print(f"🔍 Response text: {response.text[:500]}")
            
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"❌ Erreur lors de la requête: {e}")
            if hasattr(e, 'response') and e.response is not None:
                print(f"🔍 Response status: {e.response.status_code}")
                print(f"🔍 Response text: {e.response.text[:500]}")
            return None
        except json.JSONDecodeError as e:
            print(f"❌ Erreur lors du décodage JSON: {e}")
            return None
    
    def fetch_all_data(self, limit_per_page: int = 10000, max_pages: Optional[int] = None, 
                      output_file: str = "dpe_data.jsonl") -> int:
        """
        Récupère toutes les données en parcourant toutes les pages et écrit en JSON Lines
        Supporte la reprise après interruption
        
        Args:
            limit_per_page: Nombre d'éléments par page (max 10000)
            max_pages: Nombre maximum de pages à récupérer (None = toutes)
            output_file: Nom du fichier de sortie JSON Lines
            
        Returns:
            Nombre total d'enregistrements récupérés
        """
        # Vérifier si le fichier existe et contient des données
        existing_records = self.count_lines_in_file(output_file)
        
        if existing_records > 0:
            print(f"📁 Fichier existant détecté: {output_file}")
            print(f"📊 Nombre d'enregistrements déjà présents: {existing_records}")
            
            # Récupérer le dernier enregistrement
            last_record = self.get_last_record_from_file(output_file)
            
            if last_record:
                print(f"🔄 Reprise à partir de l'enregistrement: _i={last_record.get('_i')}, _rand={last_record.get('_rand')}")
                current_url = self.build_resume_url(last_record, limit_per_page)
            else:
                print("❌ Impossible de lire le dernier enregistrement, redémarrage complet")
                current_url = f"{self.base_url}?size={limit_per_page}"
                existing_records = 0
        else:
            print(f"🆕 Nouveau fichier: {output_file}")
            current_url = f"{self.base_url}?size={limit_per_page}"
            existing_records = 0
        
        page_count = 0
        new_records = 0
        
        print(f"🚀 Début de la récupération des données DPE...")
        print(f"📝 Écriture en temps réel dans: {output_file}")
        
        # Ouvrir le fichier en mode append pour reprendre
        mode = 'a' if existing_records > 0 else 'w'
        with open(output_file, mode, encoding='utf-8') as f:
            while current_url:
                page_count += 1
                total_page_number = page_count + (existing_records // limit_per_page)
                print(f"📥 Récupération de la page {page_count} (page totale ~{total_page_number})...")
                
                # Récupération de la page courante
                page_data = self.get_page(current_url)
                if not page_data:
                    print(f"❌ Erreur lors de la récupération de la page {page_count}")
                    break
                
                # Écriture des résultats en JSON Lines
                if "results" in page_data:
                    for record in page_data["results"]:
                        f.write(json.dumps(record, ensure_ascii=False) + '\n')
                        new_records += 1
                    
                    print(f"✅ Page {page_count}: {len(page_data['results'])} enregistrements écrits")
                    print(f"📊 Total: {existing_records + new_records} enregistrements")
                    f.flush()  # Force l'écriture immédiate
                
                # Vérification s'il y a une page suivante
                current_url = page_data.get("next")
                
                # Vérification de la limite de pages
                if max_pages and page_count >= max_pages:
                    print(f"🛑 Limite de {max_pages} pages atteinte")
                    break
                
                # Petite pause pour éviter de surcharger l'API
                time.sleep(0.1)
        
        total_records = existing_records + new_records
        print(f"🎉 Récupération terminée:")
        print(f"   📊 Nouveaux enregistrements: {new_records}")
        print(f"   📊 Total d'enregistrements: {total_records}")
        print(f"   📄 Pages traitées: {page_count}")
        
        return total_records
    
    def save_to_json(self, data: List[Dict[str, Any]], filename: str = "dpe_data.json"):
        """
        Sauvegarde les données dans un fichier JSON classique
        
        Args:
            data: Données à sauvegarder
            filename: Nom du fichier de sortie
        """
        try:
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            print(f"Données sauvegardées dans {filename}")
        except Exception as e:
            print(f"Erreur lors de la sauvegarde: {e}")
    
    def read_jsonl_file(self, filename: str) -> List[Dict[str, Any]]:
        """
        Lit un fichier JSON Lines et retourne une liste d'objets
        
        Args:
            filename: Nom du fichier JSON Lines à lire
            
        Returns:
            Liste des objets JSON
        """
        data = []
        try:
            with open(filename, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if line:
                        data.append(json.loads(line))
            print(f"Fichier {filename} lu: {len(data)} enregistrements")
            return data
        except Exception as e:
            print(f"Erreur lors de la lecture du fichier: {e}")
            return []
    
    def get_sample_data(self, sample_size: int = 100) -> List[Dict[str, Any]]:
        """
        Récupère un échantillon de données pour test
        
        Args:
            sample_size: Nombre d'enregistrements à récupérer
            
        Returns:
            Liste d'enregistrements échantillons
        """
        url = f"{self.base_url}?size={sample_size}"
        page_data = self.get_page(url)
        
        if page_data and "results" in page_data:
            return page_data["results"]
        return []


def main():
    """
    Fonction principale du script
    """
    # Configuration
    API_KEY = "dTp4bFdfMWNBRmZWR1Y4WFdjNzEwXzE6NmJBam5vcGJCbjBoemZnNEpIaVVl"  # Remplacez par votre clé API
    
    # Vérification de la clé API
    if API_KEY == "VOTRE_CLE_API_ICI":
        print("⚠️  Veuillez remplacer 'VOTRE_CLE_API_ICI' par votre vraie clé API")
        return
    
    # Initialisation du client
    client = AdemeApiClient(API_KEY)
    
    # Test d'authentification simple
    print("=== Test d'authentification ===")
    if not client.test_authentication():
        print("🚫 Échec de l'authentification.")
        print("💡 Vérifications suggérées:")
        print("   - Votre clé API est-elle correcte ?")
        print("   - La clé a-t-elle expiré ?")
        print("   - Y a-t-il des restrictions IP/domaine ?")
        print("   - Testez la même clé dans Postman pour confirmer")
        return
    
    print("✅ Authentification validée, continuation du script...")
    
    # Exemple: Récupération de toutes les données en JSON Lines avec reprise automatique
    print("\n=== Récupération de toutes les données avec reprise automatique ===")
    print("💡 Le script reprendra automatiquement où il s'était arrêté si interrompu")
    
    total_records = client.fetch_all_data(output_file="dpe_data_complete.jsonl")
    
    print(f"\n🎯 Récupération terminée!")
    print(f"📁 Fichier créé: dpe_data_complete.jsonl")
    print(f"📊 Total enregistrements: {total_records}")


if __name__ == "__main__":
    main()