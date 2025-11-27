import requests
import json
import time
import os
from typing import Optional, List, Dict, Any
from tqdm import tqdm

class AdemeApiClient:
    def __init__(self, api_key: str):
        """
        Initialize the ADEME API client

        Args:
            api_key: API key for authentication
        """
        self.api_key = api_key
        self.base_url = "https://data.ademe.fr/data-fair/api/v1/datasets/meg-83tjwtg8dyz4vv7h1dqe/lines"
        self.headers = {
            "x-apiKey": api_key,
            "Accept": "application/json",
            "Accept-Encoding": "gzip, deflate"
        }
        self.session = requests.Session()
        self.session.headers.update(self.headers)

        # Configure session for better performance
        adapter = requests.adapters.HTTPAdapter(
            pool_connections=10,
            pool_maxsize=10,
            max_retries=3
        )
        self.session.mount('https://', adapter)
        self.session.mount('http://', adapter)

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
    
    def get_page(self, url: str, max_retries: int = 5) -> Optional[tuple[Dict[str, Any], int]]:
        """
        Retrieves a page of data from the API with retry logic

        Args:
            url: URL of the page to retrieve
            max_retries: Maximum number of retry attempts

        Returns:
            Tuple of (data dict, response size in bytes) or None on error
        """
        for attempt in range(max_retries):
            try:
                if attempt > 0:
                    print(f"🔄 Retry {attempt}/{max_retries-1}")

                print(f"🌐 GET {url}")
                start_time = time.time()

                # No timeout - wait indefinitely
                response = self.session.get(url, timeout=None, stream=False)

                elapsed = time.time() - start_time
                response_size = len(response.content)
                size_mb = response_size / (1024 * 1024)
                print(f"⏱️  Response in {elapsed:.2f}s - Status: {response.status_code} - Size: {size_mb:.2f} MB")

                response.raise_for_status()
                return response.json(), response_size

            except requests.exceptions.Timeout as e:
                print(f"⏱️  Timeout on attempt {attempt + 1}/{max_retries}")
                if attempt < max_retries - 1:
                    # Exponential backoff: 16s, 32s, 64s, 128s
                    wait_time = 16 * (2 ** attempt)
                    print(f"⏳ Waiting {wait_time}s before retry...")
                    time.sleep(wait_time)
                    continue
                else:
                    print(f"❌ Max retries reached for timeout")
                    return None

            except requests.exceptions.RequestException as e:
                print(f"❌ Error during request (attempt {attempt + 1}/{max_retries}): {e}")
                if hasattr(e, 'response') and e.response is not None:
                    print(f"🔍 Response status: {e.response.status_code}")
                if attempt < max_retries - 1:
                    # Exponential backoff: 16s, 32s, 64s, 128s
                    wait_time = 16 * (2 ** attempt)
                    print(f"⏳ Waiting {wait_time}s before retry...")
                    time.sleep(wait_time)
                    continue
                else:
                    print(f"❌ Max retries reached")
                    return None

            except json.JSONDecodeError as e:
                print(f"❌ Error decoding JSON (attempt {attempt + 1}/{max_retries}): {e}")
                if attempt < max_retries - 1:
                    # Exponential backoff: 16s, 32s, 64s, 128s
                    wait_time = 16 * (2 ** attempt)
                    print(f"⏳ Waiting {wait_time}s before retry...")
                    time.sleep(wait_time)
                    continue
                else:
                    print(f"❌ Max retries reached")
                    return None

        return None
    
    def fetch_all_data(self, limit_per_page: int = 10000, max_pages: Optional[int] = None,
                      output_dir: str = "dpe_split", resume_from: Optional[Dict[str, Any]] = None) -> int:
        """
        Retrieves all data by iterating through all pages and writes to year/month structure
        Supports resuming from a specific record

        Args:
            limit_per_page: Number of items per page (max 10000)
            max_pages: Maximum number of pages to retrieve (None = all)
            output_dir: Output directory for year/month structure (default: dpe_split)
            resume_from: Dictionary with '_i' and '_rand' to resume from, or None to start from beginning

        Returns:
            Total number of records retrieved
        """
        from datetime import datetime
        from pathlib import Path

        # Create output directory
        output_path = Path(output_dir)
        output_path.mkdir(exist_ok=True)

        # Determine starting URL
        if resume_from:
            print(f"🔄 Resuming from: _i={resume_from.get('_i')}, _rand={resume_from.get('_rand')}")
            current_url = self.build_resume_url(resume_from, limit_per_page)
        else:
            print(f"🆕 Starting from beginning")
            current_url = f"{self.base_url}?size={limit_per_page}"

        page_count = 0
        new_records = 0
        total_records = None
        pbar = None

        # Track open file handles by year/month
        file_handles = {}
        records_by_month = {}

        print(f"🚀 Starting DPE data retrieval...")
        print(f"📝 Writing to: {output_dir}/YYYY/YYYY-MM.jsonl")

        try:
            while current_url:
                page_count += 1

                # Retrieve current page
                result = self.get_page(current_url)
                if not result:
                    print(f"❌ Error retrieving page {page_count}")
                    break

                page_data, response_size = result

                # Get total on first page and initialize progress bar
                if total_records is None and "total" in page_data:
                    total_records = page_data["total"]
                    print(f"📊 Total records in API: {total_records:,}")
                    pbar = tqdm(total=total_records, unit="records", desc="Downloading DPE")

                # Process results
                if "results" in page_data:
                    for record in page_data["results"]:
                        # Extract date
                        date_str = record.get('date_etablissement_dpe')
                        if not date_str:
                            continue

                        try:
                            date_obj = datetime.strptime(date_str, '%Y-%m-%d')
                            year = date_obj.year
                            month = date_obj.month
                            year_month_key = f"{year}/{year:04d}-{month:02d}"

                            # Get or create file handle
                            if year_month_key not in file_handles:
                                # Create year directory
                                year_dir = output_path / str(year)
                                year_dir.mkdir(exist_ok=True)

                                # Open JSONL file for this month
                                file_path = year_dir / f"{year:04d}-{month:02d}.jsonl"
                                file_handles[year_month_key] = open(file_path, 'a', encoding='utf-8')
                                records_by_month[year_month_key] = 0

                            # Write record
                            file_handles[year_month_key].write(json.dumps(record, ensure_ascii=False) + '\n')
                            records_by_month[year_month_key] += 1
                            new_records += 1

                        except (ValueError, TypeError) as e:
                            continue

                    # Update progress bar
                    if pbar:
                        pbar.update(len(page_data["results"]))

                    # Flush files every 10 pages
                    if page_count % 10 == 0:
                        for fh in file_handles.values():
                            fh.flush()

                # Check if there's a next page
                current_url = page_data.get("next")

                # Check page limit
                if max_pages and page_count >= max_pages:
                    print(f"🛑 Limit of {max_pages} pages reached")
                    break

                # Calculate wait time based on response size to respect 1 MB/s limit
                if current_url:
                    size_mb = response_size / (1024 * 1024)
                    wait_time = size_mb / 1  # 1 MB/s limit
                    print(f"⏳ Waiting {wait_time:.1f}s (rate limit: 1 MB/s for {size_mb:.2f} MB)...")
                    time.sleep(wait_time)

        finally:
            # Close progress bar
            if pbar:
                pbar.close()

            # Close all file handles
            for fh in file_handles.values():
                fh.close()

        print(f"\n🎉 Retrieval completed:")
        print(f"   📊 Total records: {new_records}")
        print(f"   📄 Pages processed: {page_count}")
        print(f"   📁 Files created: {len(file_handles)}")

        print(f"\n📅 Breakdown by month:")
        for year_month_key in sorted(records_by_month.keys()):
            print(f"   {year_month_key}: {records_by_month[year_month_key]:,} DPE")

        return new_records
    
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
    import argparse

    parser = argparse.ArgumentParser(description='ADEME DPE API Client - Downloads to year/month structure')
    parser.add_argument('--api-key', help='ADEME API key (or set ADEME_API_KEY environment variable)')
    parser.add_argument('--output-dir', default='dpe_split', help='Output directory for year/month structure (default: dpe_split)')
    parser.add_argument('--limit-per-page', type=int, default=10000, help='Items per page (default: 10000)')
    parser.add_argument('--max-pages', type=int, help='Maximum number of pages to retrieve')
    parser.add_argument('--resume-i', type=int, help='Resume from specific _i value')
    parser.add_argument('--resume-rand', type=int, help='Resume from specific _rand value')

    args = parser.parse_args()

    # Get API key from argument or environment variable
    API_KEY = args.api_key or os.getenv('ADEME_API_KEY')

    # API key verification
    if not API_KEY:
        print("⚠️  Error: API key required")
        print("   Provide it via --api-key argument or ADEME_API_KEY environment variable")
        print("\nUsage:")
        print("   python import-ademe.py --api-key YOUR_KEY")
        print("   OR")
        print("   export ADEME_API_KEY=YOUR_KEY")
        print("   python import-ademe.py")
        print("\nResume from last record:")
        print("   python import-ademe.py --resume-i 1362404395012 --resume-rand 361733")
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

    # Build resume_from dict if parameters provided
    resume_from = None
    if args.resume_i is not None and args.resume_rand is not None:
        resume_from = {
            '_i': args.resume_i,
            '_rand': args.resume_rand
        }
        print(f"\n🔄 Resume parameters provided: _i={args.resume_i}, _rand={args.resume_rand}")

    # Retrieve all data with year/month structure
    print("\n=== Retrieving data with year/month structure ===")
    print(f"💡 Output structure: {args.output_dir}/YYYY/YYYY-MM.jsonl")

    total_records = client.fetch_all_data(
        output_dir=args.output_dir,
        limit_per_page=args.limit_per_page,
        max_pages=args.max_pages,
        resume_from=resume_from
    )

    print(f"\n🎯 Retrieval completed!")
    print(f"📁 Directory created: {args.output_dir}/")
    print(f"📊 Total records: {total_records}")


if __name__ == "__main__":
    main()