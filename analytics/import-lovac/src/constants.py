import uuid

LOVAC_NAMESPACE = uuid.UUID("6ba7b810-9dad-11d1-80b4-00c04fd430c8")
PREVIOUS_OWNER_RANK = -1

OCCUPANCY_LABELS = {
    "V": "Vacant",
    "L": "En location",
    "B": "Meublé de tourisme",
    "P": "Occupé par le propriétaire",
    "RS": "Résidence secondaire non louée",
    "T": "Local commercial ou bureau",
    "N": "Dépendance",
    "D": "Local démoli ou divisé",
    "G": "Occupé à titre gratuit",
    "F": "Fonctionnaire logé",
    "R": "Occupé par un artisan exonéré",
    "U": "Utilisation commune",
    "X": "Bail rural",
    "A": "Autres",
    "inconnu": "Pas d\u2019information",
}

HOUSING_STATUS_LABELS = {
    0: "Non suivi",
    1: "En attente de retour",
    2: "Premier contact",
    3: "Suivi en cours",
    4: "Suivi terminé",
    5: "Suivi bloqué",
}
