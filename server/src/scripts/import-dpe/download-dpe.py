import requests
import pandas as pd
import time
import json
import os
from datetime import datetime

def get_api_info():
    """
    Récupère les informations sur l'API (optionnel)
    """
    info_url = "https://data.ademe.fr/data-fair/api/v1/datasets/meg-83tjwtg8dyz4vv7h1dqe"
    
    try:
        response = requests.get(info_url)
        response.raise_for_status()
        info = response.json()
        
        print("ℹ️  Informations sur le dataset:")
        print(f"  - Titre: {info.get('title', 'N/A')}")
        print(f"  - Description: {info.get('description', 'N/A')[:100]}...")
        print(f"  - Nombre total de lignes: {info.get('count', 'N/A')}")
        print(f"  - Dernière mise à jour: {info.get('updatedAt', 'N/A')}")
        
    except Exception as e:
        print(f"Impossible de récupérer les infos du dataset: {e}")

def get_dpe_data():
    """
    Récupère tous les DPE de l'ADEME en utilisant le format JSON
    """
    base_url = "https://data.ademe.fr/data-fair/api/v1/datasets/meg-83tjwtg8dyz4vv7h1dqe/lines"
    
    # Paramètres de base
    params = {
        'size': 500,
        'page': 1,
        'q_mode': 'simple',
        'finalizedAt': '2025-06-15T12:39:13.075Z',
        'format': 'json'
    }
    
    return get_dpe_data_base(base_url, params)

def get_dpe_data_with_filters(filters=None):
    """
    Version avancée qui permet d'ajouter des filtres
    
    Args:
        filters (dict): Dictionnaire de filtres à appliquer
                       Ex: {'Etiquette_DPE': 'A', 'Type_bâtiment': 'appartement'}
    """
    base_url = "https://data.ademe.fr/data-fair/api/v1/datasets/meg-83tjwtg8dyz4vv7h1dqe/lines"
    
    params = {
        'size': 500,
        'page': 1,
        'q_mode': 'simple',
        'finalizedAt': '2025-06-15T12:39:13.075Z',
        'format': 'json'
    }
    
    # Ajouter les filtres si fournis
    if filters:
        for key, value in filters.items():
            params[f'qs'] = f'{key}:"{value}"'
    
    print(f"Récupération avec filtres: {filters}")
    return get_dpe_data_base(base_url, params)

def get_dpe_data_base(base_url, params):
    """Fonction de base pour récupérer les données"""
    start_time = time.time()
    page = 1
    total_records = 0
    
    # Fichiers de sortie
    output_csv = "dpe_ademe_complet.csv"
    output_jsonl = "dpe_ademe_complet.jsonl"
    
    print("Début de la récupération des données DPE...")
    print(f"🕐 Heure de début: {datetime.now().strftime('%H:%M:%S')}")
    print(f"📄 Écriture en cours dans: {output_jsonl}")
    
    # Initialiser les fichiers
    csv_header_written = False
    
    # Ouvrir le fichier JSONL pour écriture
    with open(output_jsonl, 'w', encoding='utf-8') as jsonl_file:
        
        while True:
            params['page'] = page
            
            try:
                # Construire l'URL complète pour l'affichage
                url_with_params = f"{base_url}?" + "&".join([f"{k}={v}" for k, v in params.items()])
                print(f"🌐 URL appelée: {url_with_params}")
                
                print(f"Récupération de la page {page} (taille: {params['size']})...")
                
                page_start_time = time.time()
                response = requests.get(base_url, params=params)
                response.raise_for_status()
                page_duration = time.time() - page_start_time
                
                json_data = response.json()
                
                if 'results' not in json_data or not json_data['results']:
                    print(f"Page {page} vide - fin de la récupération")
                    break
                
                results = json_data['results']
                print(f"Page {page}: {len(results)} lignes récupérées en {page_duration:.2f}s")
                
                # Convertir en DataFrame pour cette page
                df_page = pd.DataFrame(results)
                
                # Écrire en JSONL (une ligne JSON par enregistrement)
                for record in results:
                    json.dump(record, jsonl_file, ensure_ascii=False)
                    jsonl_file.write('\n')
                
                # Écrire en CSV (mode append après la première page)
                if not csv_header_written:
                    df_page.to_csv(output_csv, index=False, encoding='utf-8', mode='w')
                    csv_header_written = True
                else:
                    df_page.to_csv(output_csv, index=False, encoding='utf-8', mode='a', header=False)
                
                total_records += len(results)
                print(f"📊 Total écrit: {total_records:,} enregistrements")
                
                # Si on a moins de résultats que demandé, c'est la dernière page
                if len(results) < params['size']:
                    print(f"Dernière page détectée ({len(results)} < {params['size']})")
                    break
                
                # Pause pour éviter de surcharger l'API
                time.sleep(0.5)
                page += 1
                
            except requests.exceptions.RequestException as e:
                print(f"Erreur lors de la requête page {page}: {e}")
                break
            except KeyError as e:
                print(f"Erreur de format JSON page {page}: {e}")
                print("Réponse reçue:", response.text[:500])
                break
            except Exception as e:
                print(f"Erreur inattendue page {page}: {e}")
                break
    
    total_time = time.time() - start_time
    
    if total_records > 0:
        print(f"\n✅ Récupération terminée!")
        print(f"⏱️  Temps total d'exécution: {total_time:.2f}s ({total_time/60:.1f} min)")
        print(f"📊 Total de lignes récupérées: {total_records:,}")
        print(f"⚡ Vitesse moyenne: {total_records/total_time:.1f} lignes/seconde")
        print(f"📄 Données sauvegardées dans:")
        
        if os.path.exists(output_csv):
            print(f"   - CSV: {output_csv} ({os.path.getsize(output_csv) / (1024*1024):.2f} MB)")
        if os.path.exists(output_jsonl):
            print(f"   - JSONL: {output_jsonl} ({os.path.getsize(output_jsonl) / (1024*1024):.2f} MB)")
        
        print(f"🕐 Heure de fin: {datetime.now().strftime('%H:%M:%S')}")
        
        # Retourner un DataFrame avec un échantillon pour compatibilité
        print(f"\n📖 Lecture d'un échantillon pour aperçu...")
        sample_df = pd.read_json(output_jsonl, lines=True, nrows=1000)
        
        # Afficher quelques statistiques
        print(f"\n📈 Aperçu des colonnes disponibles:")
        for col in sample_df.columns[:10]:  # Afficher les 10 premières colonnes
            print(f"  - {col}")
        if len(sample_df.columns) > 10:
            print(f"  ... et {len(sample_df.columns) - 10} autres colonnes")
        
        return sample_df
    else:
        print("❌ Aucune donnée récupérée")
        print(f"⏱️  Temps total d'exécution: {total_time:.2f}s")
        return None

if __name__ == "__main__":
    # Récupérer les infos du dataset
    get_api_info()
    print("\n" + "="*50 + "\n")
    
    # Récupération des données
    print("🔄 Récupération des données DPE...")
    df = get_dpe_data()
    
    if df is not None:
        print(f"\n🔍 Aperçu des premières lignes:")
        print(df.head())
        
        print(f"\n📋 Colonnes disponibles ({len(df.columns)}):")
        for i, col in enumerate(df.columns):
            print(f"  {i+1:2d}. {col}")
    
    # Exemple avec filtres
    print(f"\n{'='*50}")
    print("💡 Pour utiliser des filtres, vous pouvez utiliser:")
    print("df_A = get_dpe_data_with_filters({'Etiquette_DPE': 'A'})")
    print("df_B = get_dpe_data_with_filters({'Etiquette_DPE': 'B'})")
    print("df_all = pd.concat([df_A, df_B, ...])")