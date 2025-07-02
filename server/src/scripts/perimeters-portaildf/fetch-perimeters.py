#!/usr/bin/env python3
"""
Exhaustive retrieval of perimeters from the Cerema DF portal
and writing to a JSONL file.

– API:  https://portaildf.cerema.fr/api/perimetres?page_size=1000
– Pagination: "next" field in the response
– Authentication: Bearer Token
"""

from __future__ import annotations
import json
import sys
import time
import requests

# ──────────────────────── Paramètres à adapter ────────────────────────
TOKEN = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"  # Remplacez par votre token d'authentification
OUTPUT_FILE = "perimetres.jsonl"          # Nom du fichier de sortie
PAGE_SIZE = 1000                          # Vous pouvez réduire si besoin
API_URL = f"https://portaildf.cerema.fr/api/perimetres?page_size={PAGE_SIZE}"
REQUEST_TIMEOUT = 30                      # secondes
# ──────────────────────────────────────────────────────────────────────


def fetch_all_perimetres(api_url: str) -> int:
    """
    Parcourt toutes les pages de l’API et écrit chaque objet JSON
    sur une ligne du fichier OUTPUT_FILE.
    Retourne le nombre total d’objets écrits.
    """
    headers = {"Authorization": f"Bearer {TOKEN}"}
    written = 0
    url = api_url

    with open(OUTPUT_FILE, "w", encoding="utf-8") as fh:
        while url:
            resp = requests.get(url, headers=headers, timeout=REQUEST_TIMEOUT)
            resp.raise_for_status()  # Stoppe le script si l’appel échoue

            payload = resp.json()
            results = payload.get("results", [])
            count = payload.get("count")  # juste informatif

            for item in results:
                json.dump(item, fh, ensure_ascii=False)
                fh.write("\n")
                written += 1

            # Affichage d’avancement (optionnel)
            pct = f"{(written / count * 100):.1f} %" if count else "?"
            print(f"→ {written}/{count or '?'} objets écrits ({pct})", file=sys.stderr)

            # URL de la page suivante (None si dernière page)
            url = payload.get("next")
            if url:
                time.sleep(0.1)  # courtoisie pour l’API

    return written


def main() -> None:
    try:
        total = fetch_all_perimetres(API_URL)
        print(f"\n✅ Terminé : {total} objets enregistrés dans {OUTPUT_FILE}")
    except requests.HTTPError as e:
        print(f"💥 Erreur HTTP : {e} – URL : {e.request.url}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"💥 Erreur inattendue : {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
