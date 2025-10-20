import requests
import pandas as pd
import time
import json
import os
from datetime import datetime

def get_api_info():
    """
    Retrieves information about the API (optional)
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
        print(f"Unable to retrieve dataset info: {e}")

def get_dpe_data():
    """
    Retrieves all DPE data from ADEME using JSON format
    """
    base_url = "https://data.ademe.fr/data-fair/api/v1/datasets/meg-83tjwtg8dyz4vv7h1dqe/lines"

    # Base parameters
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
    Advanced version that allows adding filters

    Args:
        filters (dict): Dictionary of filters to apply
                       Example: {'Etiquette_DPE': 'A', 'Type_bâtiment': 'appartement'}
    """
    base_url = "https://data.ademe.fr/data-fair/api/v1/datasets/meg-83tjwtg8dyz4vv7h1dqe/lines"
    
    params = {
        'size': 500,
        'page': 1,
        'q_mode': 'simple',
        'finalizedAt': '2025-06-15T12:39:13.075Z',
        'format': 'json'
    }
    
    # Add filters if provided
    if filters:
        for key, value in filters.items():
            params[f'qs'] = f'{key}:"{value}"'

    print(f"Retrieval with filters: {filters}")
    return get_dpe_data_base(base_url, params)

def get_dpe_data_base(base_url, params):
    """Base function to retrieve data"""
    start_time = time.time()
    page = 1
    total_records = 0
    
    # Output files
    output_csv = "dpe_ademe_complet.csv"
    output_jsonl = "dpe_ademe_complet.jsonl"

    print("Starting DPE data retrieval...")
    print(f"🕐 Start time: {datetime.now().strftime('%H:%M:%S')}")
    print(f"📄 Writing to: {output_jsonl}")

    # Initialize files
    csv_header_written = False

    # Open JSONL file for writing
    with open(output_jsonl, 'w', encoding='utf-8') as jsonl_file:
        
        while True:
            params['page'] = page
            
            try:
                # Build complete URL for display
                url_with_params = f"{base_url}?" + "&".join([f"{k}={v}" for k, v in params.items()])
                print(f"🌐 Calling URL: {url_with_params}")

                print(f"Retrieving page {page} (size: {params['size']})...")
                
                page_start_time = time.time()
                response = requests.get(base_url, params=params)
                response.raise_for_status()
                page_duration = time.time() - page_start_time
                
                json_data = response.json()
                
                if 'results' not in json_data or not json_data['results']:
                    print(f"Page {page} empty - retrieval complete")
                    break

                results = json_data['results']
                print(f"Page {page}: {len(results)} lines retrieved in {page_duration:.2f}s")

                # Convert to DataFrame for this page
                df_page = pd.DataFrame(results)

                # Write to JSONL (one JSON line per record)
                for record in results:
                    json.dump(record, jsonl_file, ensure_ascii=False)
                    jsonl_file.write('\n')
                
                # Write to CSV (append mode after first page)
                if not csv_header_written:
                    df_page.to_csv(output_csv, index=False, encoding='utf-8', mode='w')
                    csv_header_written = True
                else:
                    df_page.to_csv(output_csv, index=False, encoding='utf-8', mode='a', header=False)

                total_records += len(results)
                print(f"📊 Total written: {total_records:,} records")

                # If we have fewer results than requested, it's the last page
                if len(results) < params['size']:
                    print(f"Last page detected ({len(results)} < {params['size']})")
                    break

                # Pause to avoid overloading the API
                time.sleep(0.5)
                page += 1

            except requests.exceptions.RequestException as e:
                print(f"Error during request for page {page}: {e}")
                break
            except KeyError as e:
                print(f"JSON format error on page {page}: {e}")
                print("Response received:", response.text[:500])
                break
            except Exception as e:
                print(f"Unexpected error on page {page}: {e}")
                break
    
    total_time = time.time() - start_time
    
    if total_records > 0:
        print(f"\n✅ Retrieval completed!")
        print(f"⏱️  Total execution time: {total_time:.2f}s ({total_time/60:.1f} min)")
        print(f"📊 Total lines retrieved: {total_records:,}")
        print(f"⚡ Average speed: {total_records/total_time:.1f} lines/second")
        print(f"📄 Data saved to:")
        
        if os.path.exists(output_csv):
            print(f"   - CSV: {output_csv} ({os.path.getsize(output_csv) / (1024*1024):.2f} MB)")
        if os.path.exists(output_jsonl):
            print(f"   - JSONL: {output_jsonl} ({os.path.getsize(output_jsonl) / (1024*1024):.2f} MB)")
        
        print(f"🕐 End time: {datetime.now().strftime('%H:%M:%S')}")

        # Return a DataFrame with a sample for compatibility
        print(f"\n📖 Reading a sample for preview...")
        sample_df = pd.read_json(output_jsonl, lines=True, nrows=1000)

        # Display some statistics
        print(f"\n📈 Available columns preview:")
        for col in sample_df.columns[:10]:  # Display first 10 columns
            print(f"  - {col}")
        if len(sample_df.columns) > 10:
            print(f"  ... and {len(sample_df.columns) - 10} more columns")

        return sample_df
    else:
        print("❌ No data retrieved")
        print(f"⏱️  Total execution time: {total_time:.2f}s")
        return None

if __name__ == "__main__":
    # Retrieve dataset info
    get_api_info()
    print("\n" + "="*50 + "\n")

    # Data retrieval
    print("🔄 Retrieving DPE data...")
    df = get_dpe_data()

    if df is not None:
        print(f"\n🔍 Preview of first rows:")
        print(df.head())

        print(f"\n📋 Available columns ({len(df.columns)}):")
        for i, col in enumerate(df.columns):
            print(f"  {i+1:2d}. {col}")

    # Example with filters
    print(f"\n{'='*50}")
    print("💡 To use filters, you can do:")
    print("df_A = get_dpe_data_with_filters({'Etiquette_DPE': 'A'})")
    print("df_B = get_dpe_data_with_filters({'Etiquette_DPE': 'B'})")
    print("df_all = pd.concat([df_A, df_B, ...])")