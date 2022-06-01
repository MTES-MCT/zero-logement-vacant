import React, { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { ApplicationState } from '../../store/reducers/applicationReducers';
import classNames from 'classnames';
import styles from './app-search-bar.module.scss';
import { Link } from 'react-router-dom';
import { useOutsideClick } from '../../hooks/useOutsideClick';

export interface SearchResult {
    title: string,
    redirectUrl?: string
    onclick?: () => void
}


const AppSearchResult = ({ searchResult, query}: {searchResult: SearchResult, query: string} ) => {

    const queryIndex = searchResult.title.toLowerCase().indexOf(query.toLowerCase())

    return (
        <>
            {searchResult.redirectUrl ?
                <Link className="fr-p-1w ds-fr--inline fr-link"
                      title="Afficher le détail"
                      to={searchResult.redirectUrl}>
                    {queryIndex === -1 ? searchResult.title :
                        <>
                            {searchResult.title.substr(0, queryIndex)}
                            <b>{searchResult.title.substr(queryIndex, query.length)}</b>
                            {searchResult.title.substr(queryIndex + query.length)}
                        </>
                    }
                </Link> :
                <span className="fr-p-1w ds-fr--inline fr-link" onClick={searchResult.onclick}>
                    {searchResult.title}
                </span>
            }
        </>
    )
}

const AppSearchBar = (
    {
        onSearch,
        onKeySearch,
        placeholder,
        buttonLabel,
        size,
        maxResults
    }: {
        onSearch: (text: string) => void,
        onKeySearch?: (text: string) => Promise<SearchResult[] | void>,
        placeholder?: string,
        buttonLabel?: string,
        size?: string,
        maxResults?: number
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

    const wrapperRef = useRef(null);
    useOutsideClick(wrapperRef, () => setSearchResults(undefined));

    const submitSearch = (e: SubmitEvent) => {
        e.preventDefault();
        onSearch(searchInput);
    }

    useEffect(() => {
        setSearchInput(query.trim())
    }, [query])


    return (
        <form role="search"
              data-testid="search-form"
              className={classNames(styles.searchContainer, 'fr-search-bar', { 'fr-search-bar--lg': (size === 'lg'), }) }
              onSubmit={(e: any) => submitSearch(e)}
              ref={wrapperRef}>
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
                <div className={size === 'lg' ? classNames(styles.searchResults, styles.searchResultsLg) : styles.searchResults}>
                    {!searchResults.length ?
                        <div className="fr-p-1w">Aucun résultat</div> :
                        maxResults && searchResults.length > maxResults ?
                            <div className="fr-p-1w">Trop de résultats</div> :
                            searchResults.map((result, index) =>
                                <AppSearchResult key={'result_' + index}
                                                 searchResult={result}
                                                 query={searchInput}/>
                            )
                    }
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

