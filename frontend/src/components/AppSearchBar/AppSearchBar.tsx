import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { ApplicationState } from '../../store/reducers/applicationReducers';
import classNames from 'classnames';
import styles from './app-search-bar.module.scss';
import { Link } from 'react-router-dom';

export interface SearchResult {
    title: string,
    redirectUrl: string
}

const AppSearchResult = ({ searchResult, query}: {searchResult: SearchResult, query: string} ) => {

    const queryIndex = searchResult.title.toLowerCase().indexOf(query.toLowerCase())

    return (
        <Link className="fr-p-1w ds-fr--inline fr-link"
              title="Afficher le détail" to={searchResult.redirectUrl}>
            {queryIndex === -1 ? searchResult.title :
                <>
                    {searchResult.title.substr(0, queryIndex)}
                    <b>{searchResult.title.substr(queryIndex, query.length)}</b>
                    {searchResult.title.substr(queryIndex + query.length)}
                </>
            }
        </Link>
    )
}

const AppSearchBar = (
    {
        onSearch,
        onKeySearch,
        placeholder,
        buttonLabel,
        size
    }: {
        onSearch: (text: string) => void,
        onKeySearch?: (text: string) => Promise<SearchResult[] | void>,
        placeholder?: string,
        buttonLabel?: string,
        size?: string
    }) => {

    const query = useSelector((state: ApplicationState) => state.housing.filters.query ?? '');

    const [searchInput, setSearchInput] = useState<string>(query);
    const [searchResults, setSearchResults] = useState<SearchResult[] |undefined>();

    const onKeyDown = (e: any) => (e.keyCode === 13) && submitSearch(e);

    const onKeyUp = () => {
        if (onKeySearch) {
            onKeySearch(searchInput).then(results => {
                setSearchResults(results ?? undefined)
            });
        }
    }

    const submitSearch = (e: SubmitEvent) => {
        e.preventDefault();
        onSearch(searchInput);
    }

    useEffect(() => {
        setSearchInput(query.trim())
    }, [query])

    return (
        <form role="search" data-testid="search-form" className={classNames(styles.searchContainer, 'fr-search-bar', { 'fr-search-bar--lg': (size === 'lg'), }) } onSubmit={(e: any) => submitSearch(e)}>
            <label className="fr-label">{buttonLabel ?? 'Rechercher'}</label>
            <input className="fr-input"
                   placeholder={placeholder ?? "Rechercher"}
                   type="search"
                   data-testid="search-input"
                   value={searchInput}
                   onChange={(e) => setSearchInput(e.target.value)}
                   onKeyDown={onKeyDown}
                   onKeyUp={onKeyUp}/>
            {searchInput.length > 0 && searchResults &&
                <div className={styles.searchResults}>
                    {!searchResults.length ? <div className="fr-p-1w">Aucun résultat</div> : searchResults.map((result, index) =>
                        <AppSearchResult key={'result_' + index}
                                         searchResult={result}
                                         query={searchInput}/>
                    )}
                </div>
            }
            <button type="submit"
                    className={classNames('fr-btn', { 'fr-btn--lg': (size === 'lg') })}
                    title="Bouton de recherche">
                {buttonLabel ?? 'Rechercher'}
            </button>
        </form>
    );
};

export default AppSearchBar;

