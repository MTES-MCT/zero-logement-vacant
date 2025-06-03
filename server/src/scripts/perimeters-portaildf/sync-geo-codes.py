#!/usr/bin/env python3
"""
Synchronizes the geographic perimeters of ZLV establishments from Cerema's Portail DF data.

Exported CSV files:
    • missing_cgu.csv            (cgu_valide == null)
    • missing_lovac_comm.csv     (cgu_valide not null & lovac.comm empty)
    • france_entiere.csv         (lovac.fr_entiere == true)
    • errors.csv                 (3 failed API attempts)

Swagger API documentation: https://portaildf.cerema.fr/api/swagger/

Default connection: dbname=isoprod user=postgres password=postgres host=localhost
"""

from __future__ import annotations
import argparse
import csv
import logging
import sys
import time
from pathlib import Path
from typing import Any, List, Optional

import psycopg2
import psycopg2.extras
import requests

# ──────────────────────────── Configuration ────────────────────────────
DEFAULT_DSN   = "dbname=isoprod user=postgres password=postgres host=localhost"
BASE_URL      = "https://portaildf.cerema.fr/api"
TIMEOUT       = (5, 30)
HEADERS       = {"Accept": "application/json"}

MAX_RETRY     = 3
BACKOFF_START = 1  # s

CSV_CGU        = Path("missing_cgu.csv")
CSV_LOVAC      = Path("missing_lovac_comm.csv")
CSV_FR_ENTIERE = Path("france_entiere.csv")
CSV_ERR        = Path("errors.csv")

# ──────────────────────────── API call with retries ─────────────────────────
def api_get(session: requests.Session, path: str,
            params: dict[str, Any] | None = None) -> dict:
    url = f"{BASE_URL}/{path.lstrip('/')}"
    for attempt in range(1, MAX_RETRY + 1):
        try:
            r = session.get(url, params=params, timeout=TIMEOUT)
            r.raise_for_status()
            return r.json()
        except Exception as exc:
            if attempt == MAX_RETRY:
                logging.error("⛔ %s (tentative %d/%d) – %s",
                              url, attempt, MAX_RETRY, exc)
                raise
            delay = BACKOFF_START * 2 ** (attempt - 1)
            logging.warning("Échec tentative %d/%d pour %s → attente %ds",
                            attempt, MAX_RETRY, url, delay)
            time.sleep(delay)

def fetch_structure_id(sess: requests.Session, email: str) -> Optional[int]:
    res = api_get(sess, "utilisateurs", {"email": email}).get("results", [])
    return res[0].get("structure") if res else None

def fetch_permissions(sess: requests.Session, email: str) -> tuple[List[str], Any, bool]:
    data = api_get(sess, "permissions", {"email": email})
    codes = data.get("lovac", {}).get("comm", [])
    cgu   = data.get("cgu_valide")
    fr    = data.get("lovac", {}).get("fr_entiere", False)
    return codes, cgu, fr

def fetch_siren(sess: requests.Session, structure_id: int) -> Optional[str]:
    siret = api_get(sess, f"structures/{structure_id}").get("siret") or ""
    return siret[:9] if len(siret) >= 9 and siret.isdigit() else None

# ──────────────────────────── SQL queries ─────────────────────────────
# Fetch distinct user emails with non-null establishment_id
# (to avoid fetching users without establishments)
SELECT_USERS_SQL = """
SELECT DISTINCT u.email
FROM   users u
JOIN   establishments e ON e.id = u.establishment_id
WHERE  u.establishment_id IS NOT NULL

ORDER  BY u.email
"""

# Update SQL to set localities_geo_code for a given siren
# (lovac.comm codes)
UPDATE_SQL = """
UPDATE establishments
SET    localities_geo_code = %s
WHERE  siren = %s
"""

def process_one(cur,
                sess,
                email: str,
                dummy: bool,
                rows_cgu: list[dict[str, str]],
                rows_lovac: list[dict[str, str]],
                rows_fr: list[dict[str, str]],
                counters: dict[str, int]) -> None:

    counters["total"] += 1
    logging.info("▶ %s", email)

    struct_id = fetch_structure_id(sess, email)
    if struct_id is None:
        raise RuntimeError("Utilisateur absent du portailDF")

    siren = fetch_siren(sess, struct_id)
    if siren is None:
        raise RuntimeError(f"SIREN introuvable pour structure {struct_id}")

    codes, cgu_valide, fr_entiere = fetch_permissions(sess, email)

    # France entière
    # Shoulnd not happen, but we handle it gracefully
    if fr_entiere:
        logging.info("   France entière (lovac.fr_entiere = true)")
        rows_fr.append({"email": email, "siren": siren, "structure_id": str(struct_id)})
        counters["france_entiere"] += 1
        return  # pas de mise à jour

    # CGU manquante
    # cgu_valide == null → lovacc.comm is empty
    if cgu_valide is None:
        logging.warning("   cgu_valide == null")
        rows_cgu.append({"email": email, "siren": siren, "structure_id": str(struct_id)})
        counters["missing_cgu"] += 1

    # lovac.comm is empty but cgu_valide is not-null
    # Shoulnd not happen, but we handle it gracefully
    if not codes and cgu_valide is not None:
        logging.warning("   lovac.comm vide")
        rows_lovac.append({"email": email, "siren": siren, "structure_id": str(struct_id)})
        counters["missing_lovac"] += 1
        return

    # Update
    if not codes:
        # No codes → nothing to update
        return

    if dummy:
        logging.info("   [dummy] UPDATE establishment SET localities_geo_code = %s WHERE siren = %s",
                     codes, siren)
        counters["updated"] += 1
        return

    cur.execute(UPDATE_SQL, (codes, siren))
    if cur.rowcount:
        logging.info("   ✅ %d rang(s) mis à jour (siren %s)", cur.rowcount, siren)
        counters["updated"] += 1
    else:
        raise RuntimeError(f"Aucun établissement trouvé pour siren {siren}")

def write_csv(path: Path, rows: list[dict[str, str]], headers: list[str]) -> None:
    with path.open("w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=headers)
        w.writeheader()
        w.writerows(rows)
    logging.info("CSV écrit : %s (%d ligne(s))", path.resolve(), len(rows))

def main() -> None:
    ap = argparse.ArgumentParser(description="Sync ZLV establishments' geographic perimeters from Portail DF")
    ap.add_argument("--dsn", default=DEFAULT_DSN)
    ap.add_argument("--token", required=True, help="Bearer token portailDF") # Get it from API endpoint: https://portaildf.cerema.fr/api/api-token-auth/
    ap.add_argument("--dummy", action="store_true")
    ap.add_argument("--limit", type=int, help="Limit number of users to process (for testing)")
    ap.add_argument("--log-level", default="INFO",
                    choices=["DEBUG", "INFO", "WARNING", "ERROR"])
    args = ap.parse_args()

    logging.basicConfig(level=args.log_level,
                        format="%(levelname)s %(message)s",
                        handlers=[logging.StreamHandler(sys.stdout)],
                        force=True)

    sess = requests.Session()
    sess.headers.update(HEADERS | {"Authorization": f"Bearer {args.token}"})

    conn = psycopg2.connect(args.dsn)
    conn.autocommit = False
    cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    counters = dict(total=0, updated=0, missing_cgu=0,
                    missing_lovac=0, france_entiere=0, errors=0)

    rows_cgu, rows_lovac, rows_fr, rows_err = [], [], [], []

    try:
        cur.execute(SELECT_USERS_SQL)
        users = cur.fetchall()
        if args.limit:
            users = users[:args.limit]
            logging.info("Limité à %d utilisateur(s)", len(users))

        for row in users:
            email = row["email"]
            try:
                process_one(cur, sess, email, args.dummy,
                            rows_cgu, rows_lovac, rows_fr, counters)
                if not args.dummy:
                    conn.commit()
            except Exception as exc:
                logging.error("   %s", exc)
                conn.rollback()
                rows_err.append({"email": email, "error": str(exc)})
                counters["errors"] += 1

    finally:
        cur.close()
        conn.close()
        sess.close()

    # CSV export
    write_csv(CSV_CGU,        rows_cgu,   ["email", "siren", "structure_id"])
    write_csv(CSV_LOVAC,      rows_lovac, ["email", "siren", "structure_id"])
    write_csv(CSV_FR_ENTIERE, rows_fr,    ["email", "siren", "structure_id"])
    write_csv(CSV_ERR,        rows_err,   ["email", "error"])

    # Report
    logging.info("=== Report ===")
    logging.info("Utilisateurs traités      : %d", counters["total"])
    logging.info("Mises à jour réussies     : %d", counters["updated"])
    logging.info("cgu_valide == null        : %d", counters["missing_cgu"])
    logging.info("lovac.comm manquant       : %d", counters["missing_lovac"])
    logging.info("France entière            : %d", counters["france_entiere"])
    logging.info("Erreurs (dont 3 échecs)   : %d", counters["errors"])

# ───────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    main()
