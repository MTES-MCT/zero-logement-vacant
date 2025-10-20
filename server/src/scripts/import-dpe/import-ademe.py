import requests
import json
import time
import os
from typing import Optional, List, Dict, Any

class AdemeApiClient:
    def __init__(self, api_key: str):
        """
        Initialize the ADEME API client

        Args:
            api_key: API key for authentication
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
        
        print(f"🔑 Initialization with headers: {self.headers}")

    def get_last_record_from_file(self, filename: str) -> Optional[Dict[str, Any]]:
        """
        Retrieves the last record from a JSON Lines file

        Args:
            filename: JSON Lines filename

        Returns:
            Last record or None if file is empty/doesn't exist
        """
        try:
            if not os.path.exists(filename):
                return None
            
            with open(filename, 'rb') as f:
                # Go to end of file
                f.seek(-2, os.SEEK_END)

                # Read backwards until finding a new line
                while f.read(1) != b'\n':
                    f.seek(-2, os.SEEK_CUR)

                # Read the last line
                last_line = f.readline().decode('utf-8').strip()
                
                if last_line:
                    return json.loads(last_line)
                    
        except Exception as e:
            print(f"Error reading last record: {e}")

        return None

    def build_resume_url(self, last_record: Dict[str, Any], limit_per_page: int = 10000) -> str:
        """
        Builds the URL to resume from the last record

        Args:
            last_record: Last processed record
            limit_per_page: Number of items per page

        Returns:
            URL with 'after' parameter for resuming
        """
        _i = last_record.get("_i", "")
        _rand = last_record.get("_rand", "")

        # Build 'after' parameter: _i + "%2C" + _rand
        after_param = f"{_i}%2C{_rand}"
        
        return f"{self.base_url}?size={limit_per_page}&after={after_param}"
    
    def count_lines_in_file(self, filename: str) -> int:
        """
        Counts the number of lines in a file

        Args:
            filename: Filename

        Returns:
            Number of lines
        """
        try:
            if not os.path.exists(filename):
                return 0

            with open(filename, 'r', encoding='utf-8') as f:
                return sum(1 for _ in f)
        except Exception as e:
            print(f"Error counting lines: {e}")
            return 0
    
    def test_authentication(self) -> bool:
        """
        Tests authentication with x-apiKey

        Returns:
            True if authentication succeeds, False otherwise
        """
        test_url = f"{self.base_url}?size=1"
        
        print(f"🧪 Testing authentication with: {dict(self.session.headers)}")

        try:
            response = self.session.get(test_url)
            print(f"📊 Status: {response.status_code}")

            if response.status_code == 200:
                print("✅ Authentication successful!")
                return True
            elif response.status_code == 401:
                print("❌ Authentication failed (401 Unauthorized)")
                print(f"🔍 Response text: {response.text[:500]}")
                return False
            else:
                print(f"⚠️ Unexpected status: {response.status_code}")
                print(f"🔍 Response text: {response.text[:500]}")
                return False

        except Exception as e:
            print(f"❌ Error during test: {e}")
            return False
    
    def get_page(self, url: str) -> Optional[Dict[str, Any]]:
        """
        Retrieves a page of data from the API

        Args:
            url: URL of the page to retrieve

        Returns:
            Dictionary containing page data or None on error
        """
        try:
            print(f"🌐 Request: {url}")
            print(f"🔑 Headers: {dict(self.session.headers)}")

            response = self.session.get(url)

            print(f"📊 Status: {response.status_code}")
            if response.status_code == 401:
                print(f"🔍 Response headers: {dict(response.headers)}")
                print(f"🔍 Response text: {response.text[:500]}")

            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"❌ Error during request: {e}")
            if hasattr(e, 'response') and e.response is not None:
                print(f"🔍 Response status: {e.response.status_code}")
                print(f"🔍 Response text: {e.response.text[:500]}")
            return None
        except json.JSONDecodeError as e:
            print(f"❌ Error decoding JSON: {e}")
            return None
    
    def fetch_all_data(self, limit_per_page: int = 10000, max_pages: Optional[int] = None,
                      output_file: str = "dpe_data.jsonl") -> int:
        """
        Retrieves all data by iterating through all pages and writes to JSON Lines
        Supports resuming after interruption

        Args:
            limit_per_page: Number of items per page (max 10000)
            max_pages: Maximum number of pages to retrieve (None = all)
            output_file: Output JSON Lines filename

        Returns:
            Total number of records retrieved
        """
        # Check if file exists and contains data
        existing_records = self.count_lines_in_file(output_file)

        if existing_records > 0:
            print(f"📁 Existing file detected: {output_file}")
            print(f"📊 Number of existing records: {existing_records}")

            # Get the last record
            last_record = self.get_last_record_from_file(output_file)

            if last_record:
                print(f"🔄 Resuming from record: _i={last_record.get('_i')}, _rand={last_record.get('_rand')}")
                current_url = self.build_resume_url(last_record, limit_per_page)
            else:
                print("❌ Unable to read last record, starting from beginning")
                current_url = f"{self.base_url}?size={limit_per_page}"
                existing_records = 0
        else:
            print(f"🆕 New file: {output_file}")
            current_url = f"{self.base_url}?size={limit_per_page}"
            existing_records = 0
        
        page_count = 0
        new_records = 0

        print(f"🚀 Starting DPE data retrieval...")
        print(f"📝 Writing in real-time to: {output_file}")

        # Open file in append mode to resume
        mode = 'a' if existing_records > 0 else 'w'
        with open(output_file, mode, encoding='utf-8') as f:
            while current_url:
                page_count += 1
                total_page_number = page_count + (existing_records // limit_per_page)
                print(f"📥 Retrieving page {page_count} (total page ~{total_page_number})...")

                # Retrieve current page
                page_data = self.get_page(current_url)
                if not page_data:
                    print(f"❌ Error retrieving page {page_count}")
                    break

                # Write results to JSON Lines
                if "results" in page_data:
                    for record in page_data["results"]:
                        f.write(json.dumps(record, ensure_ascii=False) + '\n')
                        new_records += 1

                    print(f"✅ Page {page_count}: {len(page_data['results'])} records written")
                    print(f"📊 Total: {existing_records + new_records} records")
                    f.flush()  # Force immediate writing

                # Check if there's a next page
                current_url = page_data.get("next")

                # Check page limit
                if max_pages and page_count >= max_pages:
                    print(f"🛑 Limit of {max_pages} pages reached")
                    break

                # Small pause to avoid overloading the API
                time.sleep(0.1)

        total_records = existing_records + new_records
        print(f"🎉 Retrieval completed:")
        print(f"   📊 New records: {new_records}")
        print(f"   📊 Total records: {total_records}")
        print(f"   📄 Pages processed: {page_count}")
        
        return total_records
    
    def save_to_json(self, data: List[Dict[str, Any]], filename: str = "dpe_data.json"):
        """
        Saves data to a standard JSON file

        Args:
            data: Data to save
            filename: Output filename
        """
        try:
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            print(f"Data saved to {filename}")
        except Exception as e:
            print(f"Error during save: {e}")
    
    def read_jsonl_file(self, filename: str) -> List[Dict[str, Any]]:
        """
        Reads a JSON Lines file and returns a list of objects

        Args:
            filename: JSON Lines filename to read

        Returns:
            List of JSON objects
        """
        data = []
        try:
            with open(filename, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if line:
                        data.append(json.loads(line))
            print(f"File {filename} read: {len(data)} records")
            return data
        except Exception as e:
            print(f"Error reading file: {e}")
            return []
    
    def get_sample_data(self, sample_size: int = 100) -> List[Dict[str, Any]]:
        """
        Retrieves a data sample for testing

        Args:
            sample_size: Number of records to retrieve

        Returns:
            List of sample records
        """
        url = f"{self.base_url}?size={sample_size}"
        page_data = self.get_page(url)
        
        if page_data and "results" in page_data:
            return page_data["results"]
        return []


def main():
    """
    Main script function
    """
    # Configuration
    API_KEY = "dTp4bFdfMWNBRmZWR1Y4WFdjNzEwXzE6NmJBam5vcGJCbjBoemZnNEpIaVVl"  # Replace with your API key

    # API key verification
    if API_KEY == "VOTRE_CLE_API_ICI":
        print("⚠️  Please replace 'VOTRE_CLE_API_ICI' with your actual API key")
        return

    # Client initialization
    client = AdemeApiClient(API_KEY)

    # Simple authentication test
    print("=== Authentication Test ===")
    if not client.test_authentication():
        print("🚫 Authentication failed.")
        print("💡 Suggested checks:")
        print("   - Is your API key correct?")
        print("   - Has the key expired?")
        print("   - Are there IP/domain restrictions?")
        print("   - Test the same key in Postman to confirm")
        return

    print("✅ Authentication validated, continuing script...")

    # Example: Retrieve all data in JSON Lines with automatic resume
    print("\n=== Retrieving all data with automatic resume ===")
    print("💡 The script will automatically resume where it left off if interrupted")

    total_records = client.fetch_all_data(output_file="dpe_data_complete.jsonl")

    print(f"\n🎯 Retrieval completed!")
    print(f"📁 File created: dpe_data_complete.jsonl")
    print(f"📊 Total records: {total_records}")


if __name__ == "__main__":
    main()