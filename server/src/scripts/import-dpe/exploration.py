import pandas as pd
import json
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import missingno as msno
from collections import Counter
import warnings
warnings.filterwarnings('ignore')

def load_dpe_data(file_path="dpe_ademe_complet.json"):
    """
    Charge les données DPE depuis le fichier JSON
    """
    print("📂 Chargement des données DPE...")
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        df = pd.DataFrame(data)
        print(f"✅ Données chargées: {len(df)} lignes, {len(df.columns)} colonnes")
        return df
    
    except FileNotFoundError:
        print(f"❌ Fichier {file_path} non trouvé")
        return None
    except Exception as e:
        print(f"❌ Erreur lors du chargement: {e}")
        return None

def analyze_departments(df):
    """
    Analyse des départements sans résultats (incluant la Corse)
    """
    print("\n" + "="*60)
    print("🗺️  ANALYSE DES DÉPARTEMENTS")
    print("="*60)
    
    # Liste de tous les départements français (métropole + DOM-TOM)
    all_departments = [
        f"{i:02d}" for i in range(1, 96)  # 01 à 95
    ] + [
        "2A", "2B",  # Corse du Sud et Haute-Corse
        "971", "972", "973", "974", "976"  # DOM-TOM (Guadeloupe, Martinique, Guyane, Réunion, Mayotte)
    ]
    
    # Exclure 20 (ancienne Corse) car remplacé par 2A et 2B
    all_departments = [dept for dept in all_departments if dept != "20"]
    
    print(f"📍 Départements français analysés: {len(all_departments)} au total")
    print(f"   - Métropole: 01 à 19, 21 à 95")
    print(f"   - Corse: 2A (Corse du Sud), 2B (Haute-Corse)")
    print(f"   - DOM-TOM: 971, 972, 973, 974, 976")
    
    # Départements présents dans les données
    if 'code_departement_ban' in df.columns:
        # Nettoyer les codes départements et gérer la Corse
        dept_values = df['code_departement_ban'].dropna().astype(str)
        
        # Vérifier si le code 20 (ancienne Corse) est présent
        has_code_20 = '20' in dept_values.values
        
        # Obtenir la liste des départements présents
        present_departments = set(dept_values.unique())
        
        # Si le code 20 est présent, on considère que 2A et 2B sont couverts
        if has_code_20:
            present_departments.discard('20')  # Retirer 20
            present_departments.add('2A')     # Ajouter 2A
            present_departments.add('2B')     # Ajouter 2B
        
        missing_departments = [dept for dept in all_departments if dept not in present_departments]
        
        # Gérer les cas particuliers pour l'affichage
        corse_cases = []
        if has_code_20:
            count_20 = (dept_values == '20').sum()
            corse_cases.append(f"Code '20' trouvé (ancienne Corse): {count_20:,} DPE - traité comme 2A+2B")
        if '2A' in dept_values.values:
            count_2a = (dept_values == '2A').sum()
            corse_cases.append(f"2A (Corse du Sud) présent: {count_2a:,} DPE")
        if '2B' in dept_values.values:
            count_2b = (dept_values == '2B').sum()
            corse_cases.append(f"2B (Haute-Corse) présent: {count_2b:,} DPE")
        
        print(f"\n📊 Départements avec des DPE: {len(present_departments)}")
        print(f"❌ Départements SANS DPE: {len(missing_departments)}")
        
        if corse_cases:
            print(f"\n🏝️  Situation de la Corse:")
            for case in corse_cases:
                print(f"   - {case}")
        
        if missing_departments:
            print(f"\n🔍 Liste des départements sans résultats:")
            # Séparer par type pour plus de clarté
            metropole_missing = [d for d in missing_departments if d.isdigit() and d not in ['971', '972', '973', '974', '976']]
            corse_missing = [d for d in missing_departments if d in ['2A', '2B']]
            domtom_missing = [d for d in missing_departments if d in ['971', '972', '973', '974', '976']]
            
            if metropole_missing:
                print(f"   📍 Métropole ({len(metropole_missing)}): {', '.join(sorted(metropole_missing))}")
            if corse_missing:
                print(f"   🏝️  Corse ({len(corse_missing)}): {', '.join(sorted(corse_missing))}")
            if domtom_missing:
                print(f"   🌴 DOM-TOM ({len(domtom_missing)}): {', '.join(sorted(domtom_missing))}")
        else:
            print("✅ Tous les départements ont des DPE!")
        
        # Top 10 des départements avec le plus de DPE (avec noms explicites)
        dept_names = {
            '75': 'Paris', '13': 'Bouches-du-Rhône', '69': 'Rhône', '59': 'Nord',
            '62': 'Pas-de-Calais', '33': 'Gironde', '44': 'Loire-Atlantique',
            '2A': 'Corse du Sud', '2B': 'Haute-Corse', '971': 'Guadeloupe',
            '972': 'Martinique', '973': 'Guyane', '974': 'Réunion', '976': 'Mayotte'
        }
        
        dept_counts = df['code_departement_ban'].value_counts().head(15)
        print(f"\n🏆 Top 15 des départements avec le plus de DPE:")
        for i, (dept, count) in enumerate(dept_counts.items(), 1):
            dept_name = dept_names.get(str(dept), f"Département {dept}")
            print(f"  {i:2d}. {dept} ({dept_name}): {count:,} DPE")
    
    else:
        print("❌ Colonne 'code_departement_ban' non trouvée")
        missing_departments = []
    
    return missing_departments

def analyze_rnb_duplicates(df):
    """
    Analyse des RNB_ID avec plusieurs DPE et numero_dpe_remplace non vide
    """
    print("\n" + "="*60)
    print("🔄 ANALYSE DES DPE REMPLACÉS")
    print("="*60)
    
    if 'rnb_id' not in df.columns:
        print("❌ Colonne 'rnb_id' non trouvée")
        return
    
    if 'numero_dpe_remplace' not in df.columns:
        print("❌ Colonne 'numero_dpe_remplace' non trouvée")
        return
    
    # Filtrer les lignes où numero_dpe_remplace n'est pas vide
    df_replaced = df[df['numero_dpe_remplace'].notna() & (df['numero_dpe_remplace'] != '')]
    
    print(f"📊 Total de DPE avec numero_dpe_remplace non vide: {len(df_replaced):,}")
    
    if len(df_replaced) == 0:
        print("ℹ️  Aucun DPE avec numero_dpe_remplace trouvé")
        return
    
    # Compter les RNB_ID qui apparaissent plusieurs fois dans ce sous-ensemble
    rnb_counts = df_replaced['rnb_id'].value_counts()
    multiple_dpe_rnb = rnb_counts[rnb_counts > 1]
    
    print(f"🔢 RNB_ID avec plusieurs DPE ET numero_dpe_remplace non vide: {len(multiple_dpe_rnb):,}")
    
    if len(multiple_dpe_rnb) > 0:
        total_affected_dpe = multiple_dpe_rnb.sum()
        print(f"📈 Total de DPE concernés: {total_affected_dpe:,}")
        print(f"📊 Moyenne de DPE par RNB_ID concerné: {multiple_dpe_rnb.mean():.1f}")
        print(f"📊 Maximum de DPE pour un RNB_ID: {multiple_dpe_rnb.max()}")
        
        # Top 10 des RNB_ID avec le plus de DPE remplacés
        print(f"\n🏆 Top 10 des RNB_ID avec le plus de DPE remplacés:")
        for i, (rnb_id, count) in enumerate(multiple_dpe_rnb.head(10).items(), 1):
            print(f"  {i:2d}. RNB_ID {rnb_id}: {count} DPE")
    
    return multiple_dpe_rnb

def general_statistics(df):
    """
    Statistiques générales sur le dataset avec explications claires
    """
    print("\n" + "="*60)
    print("📈 STATISTIQUES GÉNÉRALES")
    print("="*60)
    
    print(f"📊 Nombre total de DPE: {len(df):,}")
    print(f"💡 Chaque ligne = 1 diagnostic énergétique d'un logement/bâtiment")
    print(f"📅 Période des données: {df.shape}")
    print(f"🔄 Note: Un même logement peut avoir plusieurs DPE (renouvellement, correction, etc.)")
    
    # Colonnes importantes
    key_columns = [
        'etiquette_dpe', 'code_departement_ban', 'rnb_id', 
        'numero_dpe_remplace', 'date_visite_diagnostiqueur',
        'type_batiment', 'periode_construction'
    ]
    
    print(f"\n🔍 Aperçu des colonnes clés:")
    for col in key_columns:
        if col in df.columns:
            non_null = df[col].notna().sum()
            percentage = (non_null / len(df)) * 100
            print(f"  - {col}: {non_null:,} valeurs ({percentage:.1f}%)")
        else:
            print(f"  - {col}: ❌ Non trouvée")
    
    # Étiquettes DPE
    if 'etiquette_dpe' in df.columns:
        print(f"\n🏷️  Répartition des étiquettes DPE (classes énergétiques):")
        etiquette_counts = df['etiquette_dpe'].value_counts()
        print(f"    ➤ {len(etiquette_counts)} classes différentes sur {len(df):,} diagnostics")
        for etiquette, count in etiquette_counts.items():
            percentage = (count / len(df)) * 100
            print(f"  - Classe {etiquette}: {count:,} diagnostics ({percentage:.1f}%)")
    
    # Types de bâtiments
    if 'type_batiment' in df.columns:
        print(f"\n🏠 Top 5 des types de bâtiments diagnostiqués:")
        type_counts = df['type_batiment'].value_counts().head(5)
        total_with_type = df['type_batiment'].notna().sum()
        print(f"    ➤ {len(type_counts)} types principaux sur {total_with_type:,} diagnostics avec type renseigné")
        for type_bat, count in type_counts.items():
            percentage = (count / len(df)) * 100
            print(f"  - {type_bat}: {count:,} diagnostics ({percentage:.1f}%)")
    
    # RNB_ID uniques vs total
    if 'rnb_id' in df.columns:
        unique_rnb = df['rnb_id'].nunique()
        total_rnb = df['rnb_id'].notna().sum()
        print(f"\n🏠 Analyse des logements:")
        print(f"  - Logements uniques (RNB_ID distincts): {unique_rnb:,}")
        print(f"  - Total de diagnostics avec RNB_ID: {total_rnb:,}")
        if unique_rnb < total_rnb:
            ratio = total_rnb / unique_rnb
            print(f"  - Ratio moyen: {ratio:.1f} diagnostics par logement")
            print(f"  ➤ Certains logements ont plusieurs DPE (normal en cas de renouvellement)")

def missing_data_analysis(df):
    """
    Analyse approfondie des valeurs manquantes avec missingno
    """
    print("\n" + "="*60)
    print("🔍 ANALYSE DÉTAILLÉE DES VALEURS MANQUANTES")
    print("="*60)
    
    # Statistiques générales
    total_cells = df.shape[0] * df.shape[1]
    missing_cells = df.isnull().sum().sum()
    missing_percentage = (missing_cells / total_cells) * 100
    
    print(f"📊 Vue d'ensemble:")
    print(f"   - Total de cellules: {total_cells:,}")
    print(f"   - Cellules manquantes: {missing_cells:,} ({missing_percentage:.1f}%)")
    print(f"   - Cellules remplies: {total_cells - missing_cells:,} ({100 - missing_percentage:.1f}%)")
    
    # Valeurs manquantes par colonne
    missing_data = df.isnull().sum()
    missing_percentage_col = (missing_data / len(df)) * 100
    
    print(f"\n📋 Top 15 des colonnes avec le plus de valeurs manquantes:")
    missing_sorted = missing_percentage_col[missing_percentage_col > 0].sort_values(ascending=False)
    
    for i, (col, percentage) in enumerate(missing_sorted.head(15).items(), 1):
        count = missing_data[col]
        print(f"  {i:2d}. {col[:40]:<40} : {count:>7,} ({percentage:>5.1f}%)")
    
    # Colonnes complètement remplies
    complete_cols = missing_percentage_col[missing_percentage_col == 0]
    print(f"\n✅ Colonnes sans valeurs manquantes: {len(complete_cols)}")
    if len(complete_cols) <= 10:
        for col in complete_cols.index:
            print(f"   - {col}")
    else:
        print(f"   Exemple: {', '.join(complete_cols.index[:5].tolist())}...")
    
    # Colonnes très incomplètes (>90% manquant)
    very_incomplete = missing_percentage_col[missing_percentage_col > 90]
    if len(very_incomplete) > 0:
        print(f"\n⚠️  Colonnes très incomplètes (>90% manquant): {len(very_incomplete)}")
        for col, pct in very_incomplete.items():
            filled_count = len(df) - missing_data[col]
            print(f"   - {col:<40}: {pct:>5.1f}% manquant ({filled_count:,} valeurs sur {len(df):,})")
    
    # Colonnes moyennement incomplètes (50-90% manquant)
    moderate_incomplete = missing_percentage_col[(missing_percentage_col >= 50) & (missing_percentage_col <= 90)]
    if len(moderate_incomplete) > 0:
        print(f"\n⚠️  Colonnes moyennement incomplètes (50-90% manquant): {len(moderate_incomplete)}")
        for col, pct in moderate_incomplete.head(10).items():
            filled_count = len(df) - missing_data[col]
            print(f"   - {col:<40}: {pct:>5.1f}% manquant ({filled_count:,} valeurs sur {len(df):,})")
    
    # Résumé par catégorie de complétude
    complete_cols = len(missing_percentage_col[missing_percentage_col == 0])
    nearly_complete = len(missing_percentage_col[(missing_percentage_col > 0) & (missing_percentage_col < 10)])
    moderate_missing = len(missing_percentage_col[(missing_percentage_col >= 10) & (missing_percentage_col < 50)])
    high_missing = len(missing_percentage_col[missing_percentage_col >= 50])
    
    print(f"\n📊 Résumé de la complétude des colonnes:")
    print(f"   ✅ Complètes (0% manquant): {complete_cols} colonnes")
    print(f"   🟢 Presque complètes (<10% manquant): {nearly_complete} colonnes")  
    print(f"   🟡 Moyennement complètes (10-50% manquant): {moderate_missing} colonnes")
    print(f"   🔴 Très incomplètes (>50% manquant): {high_missing} colonnes")
    
    return missing_data, missing_percentage_col

def create_missing_data_visualizations(df):
    """
    Crée des visualisations spécifiques pour les valeurs manquantes avec missingno
    """
    print("\n" + "="*60)
    print("📊 VISUALISATIONS DES VALEURS MANQUANTES")
    print("="*60)
    
    try:
        # Limiter le dataset si trop gros pour la visualisation
        sample_size = min(len(df), 10000)
        if len(df) > sample_size:
            df_sample = df.sample(n=sample_size, random_state=42)
            print(f"📝 Échantillon utilisé pour les visualisations: {sample_size:,} lignes sur {len(df):,}")
        else:
            df_sample = df
            print(f"📝 Dataset complet utilisé: {len(df):,} lignes")
        
        # Sélectionner les colonnes les plus intéressantes (avec des valeurs manquantes)
        missing_counts = df_sample.isnull().sum()
        cols_with_missing = missing_counts[missing_counts > 0].sort_values(ascending=False)
        
        # Prendre les 20 colonnes avec le plus de valeurs manquantes
        top_cols = cols_with_missing.head(20).index.tolist()
        
        if len(top_cols) == 0:
            print("✅ Aucune valeur manquante détectée - pas de visualisation nécessaire")
            return
        
        df_viz = df_sample[top_cols]
        
        # Créer les visualisations missingno
        fig = plt.figure(figsize=(20, 16))
        
        # 1. Matrix plot - Matrice des valeurs manquantes
        plt.subplot(2, 2, 1)
        msno.matrix(df_viz, ax=plt.gca(), sparkline=False)
        plt.title('Matrice des Valeurs Manquantes\n(Blanc = Manquant, Noir = Présent)', fontsize=12)
        
        # 2. Bar plot - Comptage par colonne
        plt.subplot(2, 2, 2)
        msno.bar(df_viz, ax=plt.gca())
        plt.title('Comptage des Valeurs Non-Manquantes par Colonne', fontsize=12)
        
        # 3. Graphique simple des pourcentages manquants
        plt.subplot(2, 2, 3)
        missing_pct = df_viz.isnull().mean() * 100
        bars = plt.bar(range(len(missing_pct)), missing_pct.values)
        plt.xticks(range(len(missing_pct)), missing_pct.index, rotation=45, ha='right')
        plt.ylabel('Pourcentage de valeurs manquantes (%)')
        plt.title('Pourcentage de Valeurs Manquantes par Colonne')
        plt.grid(axis='y', alpha=0.3)
        
        # Colorer les barres selon le niveau de complétude
        for i, (bar, pct) in enumerate(zip(bars, missing_pct.values)):
            if pct == 0:
                bar.set_color('green')
            elif pct < 10:
                bar.set_color('lightgreen')
            elif pct < 50:
                bar.set_color('orange')
            else:
                bar.set_color('red')
        
        # 4. Dendrogram - Clustering des patterns
        plt.subplot(2, 2, 4)
        if len(top_cols) > 2:
            try:
                msno.dendrogram(df_viz, ax=plt.gca())
                plt.title('Clustering des Patterns de Valeurs Manquantes', fontsize=12)
            except:
                plt.text(0.5, 0.5, 'Dendrogram non disponible\n(Erreur de calcul)', 
                        ha='center', va='center', transform=plt.gca().transAxes)
                plt.title('Clustering des Patterns (Erreur)', fontsize=12)
        else:
            plt.text(0.5, 0.5, 'Dendrogram non disponible\n(Trop peu de colonnes)', 
                    ha='center', va='center', transform=plt.gca().transAxes)
            plt.title('Clustering des Patterns (Non disponible)', fontsize=12)
        
        plt.tight_layout()
        plt.savefig('dpe_missing_data_analysis.png', dpi=300, bbox_inches='tight')
        print("📈 Visualisations des valeurs manquantes sauvegardées dans 'dpe_missing_data_analysis.png'")
        
        # Explication des graphiques
        print(f"\n💡 EXPLICATION DES VISUALISATIONS MISSINGNO:")
        print(f"   📊 Matrice: Chaque ligne = un diagnostic, chaque colonne = un champ")
        print(f"       • Blanc = Valeur manquante")
        print(f"       • Noir = Valeur présente")
        print(f"       • Patterns visibles = colonnes souvent manquantes ensemble")
        print(f"   📈 Bar chart missingno: Hauteur = nombre de valeurs présentes (non manquantes)")
        print(f"       • Plus la barre est haute = plus le champ est bien rempli")
        print(f"   📊 Pourcentages manquants: Visualisation du % de valeurs manquantes")
        print(f"       • Vert = Complet, Orange = Moyennement rempli, Rouge = Très incomplet")
        print(f"   🌳 Dendrogram: Groupe les colonnes avec des patterns similaires")
        print(f"       • Colonnes proches = comportement similaire pour les valeurs manquantes")
        
    except ImportError:
        print("❌ missingno non installé. Installez-le avec: pip install missingno")
    except Exception as e:
        print(f"❌ Erreur lors de la création des visualisations missingno: {e}")

def data_quality_analysis(df):
    """
    Analyse de la qualité des données (mise à jour)
    """
    print("\n" + "="*60)
    print("🔍 ANALYSE DE LA QUALITÉ DES DONNÉES")
    print("="*60)
    
    # Utiliser la nouvelle fonction d'analyse des valeurs manquantes
    missing_data, missing_percentage_col = missing_data_analysis(df)
    
    # Créer les visualisations missingno
    create_missing_data_visualizations(df)
    
    # Doublons potentiels
    if 'rnb_id' in df.columns:
        rnb_duplicates = df['rnb_id'].value_counts()
        multiple_rnb = rnb_duplicates[rnb_duplicates > 1]
        print(f"\n🔄 RNB_ID avec plusieurs DPE (total): {len(multiple_rnb):,}")
        
        if len(multiple_rnb) > 0:
            print(f"📈 Total de DPE en doublons: {multiple_rnb.sum():,}")
    
    # Valeurs aberrantes pour les dates
    if 'date_visite_diagnostiqueur' in df.columns:
        print(f"\n📅 Analyse des dates de visite:")
        try:
            df['date_visite'] = pd.to_datetime(df['date_visite_diagnostiqueur'], errors='coerce')
            valid_dates = df['date_visite'].dropna()
            if len(valid_dates) > 0:
                print(f"  - Date la plus ancienne: {valid_dates.min()}")
                print(f"  - Date la plus récente: {valid_dates.max()}")
                print(f"  - Dates valides: {len(valid_dates):,} ({len(valid_dates)/len(df)*100:.1f}%)")
        except Exception as e:
            print(f"  - Erreur lors de l'analyse des dates: {e}")

def create_visualizations(df):
    """
    Crée des visualisations simples avec des explications claires
    """
    print("\n" + "="*60)
    print("📊 CRÉATION DES VISUALISATIONS")
    print("="*60)
    
    try:
        # Configuration
        plt.style.use('default')
        fig, axes = plt.subplots(2, 2, figsize=(16, 12))
        fig.suptitle('Analyse Exploratoire des DPE ADEME\n(Chaque ligne = 1 diagnostic énergétique)', 
                    fontsize=16, fontweight='bold')
        
        # 1. Répartition des étiquettes DPE
        if 'etiquette_dpe' in df.columns:
            etiquette_counts = df['etiquette_dpe'].value_counts()
            axes[0, 0].pie(etiquette_counts.values, labels=etiquette_counts.index, autopct='%1.1f%%')
            axes[0, 0].set_title('Répartition des Étiquettes DPE\n(% de diagnostics par classe énergétique)')
            print(f"📊 Graphique 1: Répartition de {len(df):,} diagnostics par étiquette énergétique (A à G)")
        
        # 2. Top 15 départements (avec gestion de la Corse)
        if 'code_departement_ban' in df.columns:
            dept_counts = df['code_departement_ban'].value_counts().head(15)
            
            # Noms des départements pour l'affichage
            dept_names = {
                '75': 'Paris', '13': 'Bouches-du-Rhône', '69': 'Rhône', '59': 'Nord',
                '62': 'Pas-de-Calais', '33': 'Gironde', '44': 'Loire-Atlantique',
                '2A': 'Corse du Sud', '2B': 'Haute-Corse', '20': 'Corse (ancien code)',
                '971': 'Guadeloupe', '972': 'Martinique', '973': 'Guyane', 
                '974': 'Réunion', '976': 'Mayotte'
            }
            
            bars = axes[0, 1].bar(range(len(dept_counts)), dept_counts.values)
            axes[0, 1].set_xticks(range(len(dept_counts)))
            
            # Créer les labels avec noms des départements
            labels = []
            for dept_code in dept_counts.index:
                dept_str = str(dept_code)
                if dept_str in dept_names:
                    labels.append(f"{dept_str}\n({dept_names[dept_str][:12]})")
                else:
                    labels.append(dept_str)
            
            axes[0, 1].set_xticklabels(labels, rotation=45, fontsize=8)
            axes[0, 1].set_title('Top 15 Départements\n(Nombre de diagnostics DPE réalisés)')
            axes[0, 1].set_ylabel('Nombre de diagnostics')
            
            # Ajouter les valeurs sur les barres
            for bar, value in zip(bars, dept_counts.values):
                axes[0, 1].text(bar.get_x() + bar.get_width()/2, bar.get_height() + value*0.01,
                               f'{value:,}', ha='center', va='bottom', fontsize=8)
            
            print(f"📊 Graphique 2: {len(dept_counts)} départements avec le plus de diagnostics")
            print(f"    ➤ 1 barre = nombre de logements/bâtiments diagnostiqués dans ce département")
            if '20' in [str(x) for x in dept_counts.index]:
                print(f"    ⚠️  Code '20' (ancienne Corse) présent - représente 2A + 2B combinés")
        
        # 3. Types de bâtiments
        if 'type_batiment' in df.columns:
            type_counts = df['type_batiment'].value_counts().head(10)
            bars = axes[1, 0].barh(range(len(type_counts)), type_counts.values)
            axes[1, 0].set_yticks(range(len(type_counts)))
            axes[1, 0].set_yticklabels(type_counts.index)
            axes[1, 0].set_title('Top 10 Types de Bâtiments\n(Nombre de diagnostics par type)')
            axes[1, 0].set_xlabel('Nombre de diagnostics DPE')
            
            # Ajouter les valeurs sur les barres
            for bar, value in zip(bars, type_counts.values):
                axes[1, 0].text(bar.get_width() + value*0.01, bar.get_y() + bar.get_height()/2,
                               f'{value:,}', ha='left', va='center', fontsize=9)
            
            print(f"📊 Graphique 3: Répartition par type de bâtiment")
            print(f"    ➤ Maison individuelle vs appartement vs autres types")
        
        # 4. Évolution temporelle (si possible)
        if 'date_visite_diagnostiqueur' in df.columns:
            try:
                df['date_visite'] = pd.to_datetime(df['date_visite_diagnostiqueur'], errors='coerce')
                df['year_month'] = df['date_visite'].dt.to_period('M')
                monthly_counts = df['year_month'].value_counts().sort_index().tail(24)  # 2 dernières années
                
                axes[1, 1].plot(range(len(monthly_counts)), monthly_counts.values, marker='o', linewidth=2)
                axes[1, 1].set_title('Évolution mensuelle des DPE\n(Nombre de diagnostics réalisés par mois)')
                axes[1, 1].set_ylabel('Nombre de diagnostics')
                axes[1, 1].set_xlabel('Mois (24 derniers mois)')
                axes[1, 1].grid(True, alpha=0.3)
                
                # Ajouter quelques valeurs
                for i in range(0, len(monthly_counts), 6):
                    axes[1, 1].text(i, monthly_counts.iloc[i] + monthly_counts.max()*0.02,
                                   f'{monthly_counts.iloc[i]:,}', ha='center', va='bottom', fontsize=8)
                
                print(f"📊 Graphique 4: Évolution temporelle des diagnostics")
                print(f"    ➤ Chaque point = nombre de logements diagnostiqués ce mois-là")
                
            except:
                axes[1, 1].text(0.5, 0.5, 'Données temporelles\nnon disponibles\n\n(Les dates ne sont pas\ninterprétables)', 
                               ha='center', va='center', transform=axes[1, 1].transAxes,
                               bbox=dict(boxstyle="round,pad=0.3", facecolor="lightgray"))
                axes[1, 1].set_title('Évolution temporelle des DPE\n(Non disponible)')
        
        plt.tight_layout()
        plt.savefig('dpe_analysis.png', dpi=300, bbox_inches='tight')
        print("📈 Graphiques sauvegardés dans 'dpe_analysis.png'")
        
        # Explication globale
        print(f"\n💡 EXPLICATION DES GRAPHIQUES:")
        print(f"   🏠 1 ligne dans le fichier = 1 diagnostic DPE d'un logement/bâtiment")
        print(f"   📊 'Nombre de DPE' = nombre de diagnostics énergétiques effectués")
        print(f"   🔢 Total analysé: {len(df):,} diagnostics")
        print(f"   📅 Un même logement peut avoir plusieurs DPE (renouvellement, correction, etc.)")
        
    except Exception as e:
        print(f"❌ Erreur lors de la création des visualisations: {e}")

def main():
    """
    Fonction principale d'analyse
    """
    print("🔬 ANALYSE EXPLORATOIRE DES DPE ADEME")
    print("="*60)
    
    # Charger les données
    df = load_dpe_data()
    if df is None:
        return
    
    # Analyses principales
    general_statistics(df)
    
    # Répondre aux questions spécifiques
    missing_departments = analyze_departments(df)
    multiple_dpe_rnb = analyze_rnb_duplicates(df)
    
    # Analyses complémentaires
    data_quality_analysis(df)
    
    # Créer des visualisations
    create_visualizations(df)
    
    # Résumé des réponses aux questions
    print("\n" + "="*60)
    print("📋 RÉSUMÉ DES RÉPONSES")
    print("="*60)
    
    if 'code_departement_ban' in df.columns:
        print(f"1️⃣  Départements sans DPE: {len(missing_departments)} départements")
        if missing_departments:
            # Séparer par type pour plus de clarté
            metropole_missing = [d for d in missing_departments if d.isdigit() and d not in ['971', '972', '973', '974', '976']]
            corse_missing = [d for d in missing_departments if d in ['2A', '2B']]
            domtom_missing = [d for d in missing_departments if d in ['971', '972', '973', '974', '976']]
            
            if metropole_missing:
                print(f"    📍 Métropole: {', '.join(sorted(metropole_missing))}")
            if corse_missing:
                print(f"    🏝️  Corse: {', '.join(sorted(corse_missing))}")
            if domtom_missing:
                print(f"    🌴 DOM-TOM: {', '.join(sorted(domtom_missing))}")
        
        # Vérification spéciale pour la Corse
        corse_check = df['code_departement_ban'].astype(str)
        corse_status = []
        if '20' in corse_check.values:
            count_20 = (corse_check == '20').sum()
            corse_status.append(f"Code '20' (ancienne Corse): {count_20:,} DPE")
        if '2A' in corse_check.values:
            count_2a = (corse_check == '2A').sum()
            corse_status.append(f"Code '2A' (Corse du Sud): {count_2a:,} DPE")
        if '2B' in corse_check.values:
            count_2b = (corse_check == '2B').sum()
            corse_status.append(f"Code '2B' (Haute-Corse): {count_2b:,} DPE")
        
        if corse_status:
            print(f"    🏝️  Statut Corse: {' | '.join(corse_status)}")
    
    if 'rnb_id' in df.columns and 'numero_dpe_remplace' in df.columns:
        df_replaced = df[df['numero_dpe_remplace'].notna() & (df['numero_dpe_remplace'] != '')]
        rnb_counts = df_replaced['rnb_id'].value_counts()
        multiple_dpe_rnb = rnb_counts[rnb_counts > 1]
        print(f"2️⃣  RNB_ID avec plusieurs DPE ET numero_dpe_remplace non vide: {len(multiple_dpe_rnb):,}")
    
    print(f"\n✅ Analyse terminée!")
    print(f"📈 Fichiers générés:")
    print(f"   - dpe_analysis.png (visualisations principales)")
    print(f"   - dpe_missing_data_analysis.png (analyse des valeurs manquantes)")
    print(f"\n💡 Pour installer missingno si nécessaire: pip install missingno")

if __name__ == "__main__":
    main()