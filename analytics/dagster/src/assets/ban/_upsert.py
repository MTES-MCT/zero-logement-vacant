"""Shared upsert helpers for ban_addresses (owners + housings)."""
from io import StringIO
from typing import Literal

import pandas as pd

AddressKind = Literal["Owner", "Housing"]

EXPECTED_COLS = [
    "ref_id",
    "house_number",
    "address",
    "street",
    "postal_code",
    "city",
    "latitude",
    "longitude",
    "score",
    "ban_id",
    "address_kind",
    "last_updated_at",
]


def create_temp_table(cursor) -> None:
    cursor.execute(
        """
        CREATE TEMP TABLE IF NOT EXISTS temp_ban_addresses (
            ref_id UUID, house_number TEXT, address TEXT, street TEXT,
            postal_code TEXT, city TEXT, latitude FLOAT, longitude FLOAT,
            score FLOAT, ban_id TEXT, address_kind TEXT, last_updated_at TIMESTAMP
        ) ON COMMIT PRESERVE ROWS;
        """
    )


def prepare_valid(api_data: pd.DataFrame, address_kind: AddressKind) -> pd.DataFrame:
    """Rows where result_status == 'ok'. Mapped to ban_addresses schema."""
    valid = api_data[api_data["result_status"] == "ok"].copy()
    if valid.empty:
        return valid

    valid = valid.rename(
        columns={
            "result_housenumber": "house_number",
            "result_label": "address",
            "result_street": "street",
            "result_postcode": "postal_code",
            "result_city": "city",
            "result_score": "score",
            "result_id": "ban_id",
        }
    )
    valid["address_kind"] = address_kind
    valid["last_updated_at"] = pd.Timestamp.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    return valid.reindex(columns=EXPECTED_COLS, fill_value="NULL")


def prepare_not_found(api_data: pd.DataFrame, address_kind: AddressKind) -> pd.DataFrame:
    """Sentinel rows for non-matched addresses (score=0, ban_id=NULL).

    Prevents infinite retry — last_updated_at = now() removes them from the
    daily predicate until the TTL window elapses.
    """
    nf = api_data[api_data["result_status"] != "ok"].copy()
    if nf.empty:
        return nf

    nf["address"] = nf["address_dgfip"]
    nf["address_kind"] = address_kind
    nf["last_updated_at"] = pd.Timestamp.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    nf["score"] = 0.0
    nf["ban_id"] = "NULL"
    for col in ("house_number", "street", "postal_code", "city", "latitude", "longitude"):
        nf[col] = "NULL"
    return nf.reindex(columns=EXPECTED_COLS, fill_value="NULL")


def copy_upsert(cursor, df: pd.DataFrame) -> int:
    """Bulk-load df into ban_addresses via temp table + COPY + upsert.

    Returns the number of rows written.
    """
    if df.empty:
        return 0

    buf = StringIO()
    df.to_csv(buf, sep="\t", header=False, index=False, quoting=3)
    buf.seek(0)
    cursor.copy_from(buf, "temp_ban_addresses", sep="\t", null="NULL", columns=EXPECTED_COLS)

    cursor.execute(
        """
        INSERT INTO ban_addresses (
            ref_id, house_number, address, street, postal_code, city,
            latitude, longitude, score, ban_id, address_kind, last_updated_at
        )
        SELECT * FROM temp_ban_addresses
        ON CONFLICT (ref_id, address_kind) DO UPDATE SET
            house_number = EXCLUDED.house_number,
            address = EXCLUDED.address,
            street = EXCLUDED.street,
            postal_code = EXCLUDED.postal_code,
            city = EXCLUDED.city,
            latitude = EXCLUDED.latitude,
            longitude = EXCLUDED.longitude,
            score = EXCLUDED.score,
            ban_id = EXCLUDED.ban_id,
            last_updated_at = EXCLUDED.last_updated_at;
        """
    )
    cursor.execute("TRUNCATE temp_ban_addresses;")
    return len(df)
