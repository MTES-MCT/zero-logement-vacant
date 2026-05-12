"""BAN API client with retry/backoff."""
from io import BytesIO, StringIO

import pandas as pd
import requests
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)


class BanApiError(Exception):
    """Raised for retryable BAN API failures (5xx / 429)."""


class BanApiFatalError(Exception):
    """Raised for non-retryable BAN API failures (4xx other than 429)."""


@retry(
    stop=stop_after_attempt(5),
    wait=wait_exponential(multiplier=2, min=2, max=60),
    retry=retry_if_exception_type((BanApiError, requests.RequestException)),
    reraise=True,
)
def call_ban_api(df: pd.DataFrame, api_url: str, timeout: int = 120) -> pd.DataFrame:
    """POST a CSV batch to the BAN /search/csv endpoint and return parsed response.

    Retries on transient errors (5xx, 429, network). Does not retry on 4xx.
    """
    csv_buffer = StringIO()
    df.to_csv(csv_buffer, index=False)
    csv_buffer.seek(0)

    data = {"columns": "address_dgfip"}
    if "geo_code" in df.columns:
        data["citycode"] = "geo_code"

    files = {"data": ("chunk.csv", csv_buffer, "text/csv")}
    response = requests.post(api_url, files=files, data=data, timeout=timeout)

    if response.status_code == 429 or response.status_code >= 500:
        raise BanApiError(f"BAN transient status {response.status_code}")
    if response.status_code != 200:
        raise BanApiFatalError(
            f"BAN non-retryable status {response.status_code}: {response.text[:200]}"
        )

    return pd.read_csv(BytesIO(response.content))
