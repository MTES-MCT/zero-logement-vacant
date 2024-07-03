from datetime import datetime, timedelta
import itertools
import numpy as np
import pandas as pd
from thefuzz import fuzz

from flashtext import KeywordProcessor


FUZZY_RATIO = 80

def match(a, b):
    return fuzz.token_set_ratio(a, b) > FUZZY_RATIO


def _add_fuzzy_ratio(df_owners):
    # df_owners[f"match_partial_address_{index}"] = df_owners.apply(
    #     lambda x: match(x[f'ff_owner_{index}_partial_address'], x['owner_partial_address']), 
    #     axis=1
    # )

    df_owners["match_raw_address"] = df_owners.apply(
        lambda x: match(x['ff_owner_raw_address'], x['owner_raw_address']), 
        axis=1
    )

    df_owners["match_postal_code"] = (df_owners['ff_owner_postal_code'] ==  df_owners['owner_postal_code'])
    
    # df_owners[f"match_city_{index}"] = df_owners.apply(
    #     lambda x: match(x[f'ff_owner_{index}_city'], x['owner_city']), 
    #     axis=1
    # )
    df_owners["match_fullname"] = df_owners.apply(
        lambda x: match(x['ff_owner_fullname'], x['owner_fullname']), 
        axis=1
    )
    return df_owners

def _add_first_name_ratio(df_owners, df_prenoms):

    # TODO: ajouter le filtre pour les prénoms de moins de 3 charactères
    list_first_names = df_prenoms[df_prenoms["sum"] > 100]["prenom"].tolist()
    keyword_processor = KeywordProcessor()
    keyword_processor.add_keywords_from_list(list_first_names)
    df_owners["owner_first_names"] = df_owners["owner_fullname"].fillna("").apply(keyword_processor.extract_keywords)
    df_owners["ff_owner_first_names"] = df_owners["ff_owner_fullname"].fillna("").apply(keyword_processor.extract_keywords)
    df_owners["match_same_first_name"] = df_owners.apply(
        lambda x: len(set(x["owner_first_names"]).intersection(set(x["ff_owner_first_names"]))) >= 1, axis=1)
        
    return df_owners
    

def _define_score_reason(x):
    if x["match_fullname"] is True:
        if x["match_raw_address"] is True:
            return 10, "match_fullname, match_raw_address"
        if x["match_postal_code"] is True:
            return 9, "match_fullname, match_postal_code"
        return 8, "match_fullname"
    if x["match_same_first_name"] is True:
        if x["match_raw_address"] is True:
            return 7, "match_same_first_name, match_raw_address"
        if x["match_postal_code"] is True:
            return 6, "match_same_first_name, match_postal_code"
        return 5, "match_same_first_name"
    return 0, "no_match"


def _process_biscom_scores(x):
    if x.mutation_date > datetime.utcnow() - timedelta(days=2*365):
        # Il y a eu une vente dans les deux dernières années
        return 2, "mutation_in_last_two_years"
    else:
        return 1, "no_mutation_in_last_two_years"

    
def _get_df_with_no_scores(df_owners):
    df_with_no_match =  df_owners.merge(
        df_owners.groupby("local_id")["final_owner_score"].sum().reset_index().query("final_owner_score == 0").drop("final_owner_score", axis=1), 
        on="local_id",
        how="inner")
    
    df_with_no_match["final_owner_score"] = df_with_no_match.apply(
        lambda x: _process_biscom_scores(x)[0],
        axis=1
    )
    df_with_no_match["final_owner_reason"] = df_with_no_match.apply(
        lambda x: _process_biscom_scores(x)[1],
        axis=1
    )

    return df_with_no_match


def _get_df_with_scores(df_owners):
    df_with_match =  df_owners.merge(
        df_owners.groupby("local_id")["final_owner_score"].sum().reset_index().query("final_owner_score > 0").drop("final_owner_score", axis=1), 
        on="local_id",
        how="inner")
    return df_with_match

def _process_scores(df_owners):
    df_owners["final_owner_score"]   = df_owners.apply(lambda x: _define_score_reason(x)[0], axis=1)
    df_owners["final_owner_reason"]   = df_owners.apply(lambda x: _define_score_reason(x)[1], axis=1)

    df_owners_with_no_scores = _get_df_with_no_scores(df_owners)
    df_owners_with_scores = _get_df_with_scores(df_owners)

    df_owners = pd.concat([
        df_owners_with_scores,
        df_owners_with_no_scores
    ])
    return df_owners


def _structure_data(df):
    data = []
    for index in range(1, 7):
        data.append(
            df[
                [
                "local_id", 
                "owner_fullname",
                "owner_postal_code",
                "owner_raw_address",
                "owner_city",
                "mutation_date",
                f"ff_owner_{index}_fullname",
                f"ff_owner_{index}_postal_code",
                f"ff_owner_{index}_birth_date", 
                f"ff_owner_{index}_raw_address",
                f"ff_owner_{index}_idprodroit"
                ]
            ].assign(rank=index).rename(
            columns={
                f"ff_owner_{index}_fullname": "ff_owner_fullname",
                f"ff_owner_{index}_postal_code": "ff_owner_postal_code",
                f"ff_owner_{index}_birth_date": "ff_owner_birth_date",
                f"ff_owner_{index}_raw_address": "ff_owner_raw_address",
                f"ff_owner_{index}_city": "ff_owner_city",
                f"ff_owner_{index}_idprodroit": "ff_owner_idprodroit",
            }).dropna(subset=["ff_owner_fullname"])# Drop toutes les lignes ou le nom est vide
    )
        
    df = pd.concat(data)
    return df

def model(dbt, session):
    upstream_model = dbt.ref("int_zlovac")
    first_names_seed = dbt.ref("prenom")


    df_owners = upstream_model.to_df()
    df_prenoms = first_names_seed.to_df()

    df_owners = _structure_data(df_owners)
    df_owners = _add_fuzzy_ratio(df_owners=df_owners)
    df_owners = _add_first_name_ratio(df_owners=df_owners, df_prenoms=df_prenoms)
    df_owners = _process_scores(df_owners=df_owners)

    return df_owners

