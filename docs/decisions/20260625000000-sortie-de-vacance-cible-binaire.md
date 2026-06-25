---
statut: accepté
date: 2026-06-25
---

# Sortie de vacance définie comme absence de LOVAC 2026 (cible binaire)

Une unité est considérée "sortie de la vacance" si et seulement si elle apparaît dans au moins un millésime LOVAC 2019–2025 **et** est absente du millésime LOVAC 2026. La cible est binaire : sortie ou non sortie. Aucune distinction n'est faite entre les causes possibles de sortie (vendue, louée, démolie, hors périmètre fiscal).

## Contexte et problématique

LOVAC est une base fiscale, pas une base de transactions ou d'usage. L'absence d'un logement du millésime 2026 peut signifier : il est désormais occupé (loué ou habité), il a été vendu à une personne qui l'occupe, il a été démoli, la commune a quitté la liste TLV, ou il s'agit d'une erreur de données. Ces causes ne sont pas distinguables de manière fiable dans les données disponibles.

## Décision

Cible binaire : absent de LOVAC 2026 = sorti. Présent dans LOVAC 2026 = non sorti.

Justification : (1) distinguer les causes nécessiterait de croiser DVF + FIDJI + Sit@del2 avec des taux de correspondance trop faibles pour être fiables, (2) l'objectif politique de ZLV est de réduire la vacance quelle qu'en soit la sortie, (3) une cible binaire propre est préférable à une cible multi-classe bruitée.

### Conséquences

- Bon : cible stable, reproductible, testable. Cohérente avec la définition réglementaire de la vacance (présence/absence dans LOVAC).
- Mauvais : impossible de distinguer une "vraie" sortie (remise sur le marché) d'une sortie due à un changement de périmètre TLV ou à une erreur de données. Le taux de sortie apparent peut surestimer l'impact réel des politiques.
- Mauvais : les communes qui rejoignent ou quittent la liste TLV entre 2025 et 2026 créent des entrées/sorties mécaniques sans changement d'usage effectif.
