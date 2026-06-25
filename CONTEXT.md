# Zéro Logement Vacant

A French government platform helping local public authorities identify, track, and act on vacant housing in their territory, using fiscal and cadastral data from DGFiP/CEREMA.

## Language

### Housing

**Logement**:
A residential housing unit (apartment or house) tracked in ZLV. The atomic unit of all analysis and outreach.
_Avoid_: bien immobilier, propriété, habitat, local

**Logement vacant**:
A housing unit declared unoccupied in DGFiP fiscal data for at least 2 consecutive years. Specifically: a unit with `aff = 'H'`, not assessed for taxe d'habitation, owned by a private actor (LOVAC group filter), and with `debutvacance < data_year - 2`.
_Avoid_: logement inoccupé, logement libre, logement abandonné

**Sortie de vacance**:
A housing unit that appeared in at least one LOVAC millésime 2019–2025 but is absent from LOVAC 2026. The primary outcome measure for the platform. Binary: a unit either exited or did not.
_Avoid_: retour à l'occupation, remise sur le marché, fin de vacance, logement remis sur le marché

**Passoire énergétique**:
A housing unit with DPE energy class F or G. A secondary intervention target alongside vacancy.
_Avoid_: passoire thermique (informal), logement énergivore, mauvais DPE

**Débutvacance**:
The year a housing unit's current vacancy spell began, as recorded in LOVAC (`debutvacance` field). Represents the start of the fiscal declaration, not necessarily the physical vacancy.
_Avoid_: année de début de vacance, date de vacance, vacancy_start_year (code alias only)

**Occupation**:
The current physical use of a housing unit as known by the system: VACANT, RENT (louée), PRIMARY_RESIDENCE (résidence principale), SECONDARY_RESIDENCE, COMMERCIAL_OR_OFFICE, etc. Distinct from the workflow **statut de suivi**. Updated either from source data (LOVAC/FF import) or manually by a collectivité agent.
_Avoid_: affectation, usage, état d'occupation

**Statut de suivi**:
The 6-level workflow state of a housing unit within ZLV, reflecting the collectivité's follow-up progress: Non-suivi (0) → En attente de retour (1) → Premier contact (2) → Suivi en cours (3) → Suivi terminé (4) → Bloqué (5).
_Avoid_: état, situation, statut ZLV, statut logement

**Sous-statut**:
A qualitative precision on a statut de suivi (e.g. "Sortie de la vacance" within Suivi terminé, or "Blocage volontaire du propriétaire" within Bloqué). Each parent status has its own set of valid sous-statuts.
_Avoid_: état détaillé, précision de statut, label de statut

**Précision**:
A structured tag attached to a housing unit, organized in three families: dispositifs (mechanisms — incitatifs, coercitifs, hors-dispositif), blocages (blocking points — involontaire, volontaire, immeuble, tiers), and évolution (travaux, occupation, mutation). Multiple précisions can coexist on the same unit.
_Avoid_: tag, étiquette, catégorie de suivi

---

### Ownership

**Propriétaire**:
A natural or legal person holding a property right over a housing unit. Identified by an `idpersonne` from Fichiers Fonciers (for FF-matched owners) or by name from LOVAC.
_Avoid_: détenteur, possesseur, bailleur (bailleur = landlord, a specific sub-type)

**Rang**:
The ordinal rank of a propriétaire on a housing unit: 1 = propriétaire principal (primary, always one per unit), 2–6 = co-propriétaires (secondary). Ranks ≤ 0 are inactive: 0 = previous owner, −1 = incorrect, −2 = awaiting resolution, −3 = deceased.
_Avoid_: ordre, priorité, position

**Propriétaire principal**:
The rank-1 owner of a housing unit. Corresponds to the LOVAC `proprietaire` field (CER 1767). There is exactly one propriétaire principal per housing unit.
_Avoid_: propriétaire primaire, premier propriétaire

**Indivision**:
A form of joint ownership where multiple people hold undivided shares of a housing unit without a legal structure. The housing unit belongs to the indivision, not to any single individual.
_Avoid_: copropriété (which denotes a building's joint ownership by apartment holders, a different concept)

**SCI (Société Civile Immobilière)**:
A legal entity (company) formed specifically to hold real estate. Treated as a single propriétaire with a SIREN identifier; natural persons behind the SCI are not tracked in ZLV.
_Avoid_: société, personne morale, entreprise immobilière

---

### Collectivité & Territory

**Collectivité**:
A local public authority (commune, EPCI, département, region, or state deconcentrated service) that uses ZLV to monitor and act on vacant housing in its territory. Synonymous with **établissement** in the codebase.
_Avoid_: structure, organisme, institution, partenaire

**Périmètre géographique**:
A custom geographic polygon defined by a collectivité agent to restrict or target housing queries. Distinct from the collectivité's administrative territory (its geoCodes). Optional; when absent, the full administrative territory applies.
_Avoid_: zone géographique, territoire personnalisé, filtre géographique

**Droits d'accès géographiques**:
The territory a user is authorized to see, computed as the intersection of their collectivité's administrative geoCodes and their user perimeter from Portail DF. Only applies to standard users (USUAL role); admins and visitors bypass this filtering.
_Avoid_: périmètre utilisateur, accès territoire, filtrage géographique

**Code INSEE** (geo_code):
The official 5-digit code identifying a French commune, used as the primary geographic key throughout ZLV. First 2 digits identify the département.
_Avoid_: code postal, identifiant commune, code géographique

**EPCI**:
Établissement Public de Coopération Intercommunale; a grouping of communes (CA = Communauté d'Agglomération, CC = Communauté des Communes, CU = Communauté Urbaine, ME = Métropole) that acts as a single collectivité in ZLV.
_Avoid_: intercommunalité (acceptable informally), groupement de communes

**Portail DF**:
The CEREMA platform managing which collectivités have access to LOVAC data and for which geographic territories. ZLV synchronizes user rights from Portail DF at each login.
_Avoid_: API CEREMA, Datafoncier portal, plateforme d'accès

---

### Campaigns & Outreach

**Campagne**:
A batch outreach action created by a collectivité to contact property owners of a selected set of housing units, typically via postal letters. Always created from a groupe. Has a lifecycle: draft → sending → sent → archived.
_Avoid_: envoi, mailing, action de contact, campagne postale

**Groupe**:
A curated list of housing units assembled by a collectivité agent as a workspace — a precursor to creating a campagne or for organizing follow-up work. A campagne is always seeded from a groupe.
_Avoid_: sélection, liste de logements, panier, filtre sauvegardé

**Retour**:
A response signal for campaign attribution: a housing unit in a sent campagne for which a collectivité agent recorded a status or occupancy change after the send date, within a defined time window (3, 6, 9, or 36 months).
_Avoid_: réponse, feedback, retour propriétaire

**Taux de retour**:
The proportion of housing units in a sent campagne that produced a retour within a given time window. The primary effectiveness metric for campaigns.
_Avoid_: taux de réponse, taux d'efficacité

---

### Data Sources

**LOVAC**:
The annual DGFiP/CEREMA database of housing units declared vacant for tax purposes. Published as independent annual snapshots (millésimes). Primary source of vacant housing inventory in ZLV.
_Avoid_: base des logements vacants, fichier des vacants

**Millésime LOVAC**:
A specific year's edition of LOVAC data (e.g. LOVAC 2026). Each millésime is an independent snapshot, not an update to the previous one. ZLV maintains millésimes 2019–2026.
_Avoid_: version LOVAC, édition LOVAC, LOVAC année N

**Fichiers Fonciers (FF)**:
The annual DGFiP cadastral extract containing all real estate properties and their legal owners. Source of owner identity (`idpersonne`, `catpro_3` codes), building data, and parcel geometry. Published by CEREMA.
_Avoid_: base foncière, données cadastrales, cadastre numérique

**idpersonne**:
The DGFiP/CEREMA stable identifier for a natural or legal person in Fichiers Fonciers. The key for owner deduplication across FF vintages and LOVAC. Not always present (older LOVAC entries may lack FF matching).
_Avoid_: identifiant propriétaire, ID personne, code personne

**catpro_3**:
The DGFiP 4-character code classifying an owner's legal category in Fichiers Fonciers (e.g. X1a = Particulier, G1a = SCI, F1a = bailleur social). The authoritative source for owner type classification.
_Avoid_: type de propriétaire, catégorie fiscale, code propriétaire

**BAN (Base Adresse Nationale)**:
The French national address database used for geocoding housing and owner addresses. Address matching score (`ban_result_score`) indicates geocoding confidence.
_Avoid_: base d'adresses, géocodeur national

**DPE (Diagnostic de Performance Énergétique)**:
An energy performance certificate rating a housing unit A–G on energy efficiency. DPE F or G = passoire énergétique. Linked to buildings via RNB identifier.
_Avoid_: label énergétique, bilan thermique, classe énergie

**RNB (Référentiel National des Bâtiments)**:
The national building register providing a unique identifier (`rnb_id`) per physical building. Used to link DPE certificates to housing units. Highest-priority geocoding source in ZLV.
_Avoid_: identifiant bâtiment national, référentiel bâtiment

---

### Policy Instruments

**TLV (Taxe sur les Logements Vacants)**:
A national annual tax applied to vacant housing in high-demand zones. Three successive zone definitions: TLV 2013, TLV 2023, TLV 2026. Communes in TLV zones are "Article 232" communes.
_Avoid_: taxe vacance, taxe sur la vacance, imposition logements vacants

**THLV (Taxe d'Habitation sur les Logements Vacants)**:
A locally-voted vacancy tax applicable to communes outside TLV zones. Each commune may or may not have deliberated to apply it.
_Avoid_: TLV locale, taxe d'habitation vacance

**OPAH (Opération Programmée d'Amélioration de l'Habitat)**:
A territorial housing improvement programme with a defined geographic perimeter and duration, co-financed by ANAH. Subtypes include OPAH-RU (urban renewal) and OPAH-RR (rural revitalization).
_Avoid_: programme de rénovation, programme ANAH

**ORT (Opération de Revitalisation de Territoire)**:
A revitalization framework for medium-sized cities, notable because its signing date (`ort_signed_at`) enables causal analysis (difference-in-differences) of its impact on vacancy.
_Avoid_: contrat ORT, opération centre-ville

**Zonage ABC**:
The DGALN housing market tension classification: A bis, A, B1 (zone tendue — high demand) and B2, C (zone détendue — low demand). Determines TLV eligibility and contextualizes vacancy rates.
_Avoid_: zones tendues/détendues (acceptable shorthand), zones de tension immobilière

---

### Analytics Platform

**Cohorte sortie de vacance**:
The set of housing units that appeared in at least one LOVAC millésime 2019–2025, used as the denominator population for vacancy exit analysis. Units appearing only in LOVAC 2026 (new entrants) are excluded because they have no exit opportunity in the reference year.
_Avoid_: population d'analyse, ensemble d'étude, base de référence

**Score d'engagement ZLV**:
A 0–10 composite score measuring how actively a collectivité has used the ZLV platform to contact and follow up on a specific housing unit. Combines campaign contact (0–3), group membership (0–1), collectivité activation level (0–3), and collectivité pro-activité (0–3).
_Avoid_: score de suivi, score d'action, indicateur d'engagement

**Pro-activité**:
A quartile-based ranking of a collectivité's ZLV campaign activity relative to its LOVAC stock size. Summarized as: Non pro-actif / Peu pro-actif / Pro-actif / Très pro-actif.
_Avoid_: activité collectivité, engagement collectivité, niveau d'utilisation

**Activation (collectivité)**:
A 4-level typology of a collectivité's ZLV usage maturity: CT inactive (logged in, no action) → CT en analyse (groups created, no campaign) → CT en campagne (campaigns created, none sent) → CT activée (at least one sent campaign).
_Avoid_: maturité d'usage, niveau d'activation, stade d'adoption

**Événement**:
A timestamped, structured audit log entry recording a change to a housing unit or owner (status update, occupancy change, campaign attachment, document upload, etc.). The primary history trail for a housing unit. Two incompatible schemas coexist: "old" events (text-parsed, pre-2023) and "new" events (structured JSON).
_Avoid_: log, trace, historique, action

**user_source**:
The origin of an événement: `'zlv'` for changes made automatically or by the platform team (@beta.gouv.fr emails), `'user'` for changes made by collectivité agents. Only user-source events count toward pro-activité and campaign retour metrics.
_Avoid_: source utilisateur, type d'action, origine événement
