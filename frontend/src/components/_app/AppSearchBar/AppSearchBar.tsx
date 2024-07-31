import { useEffect, useRef, useState } from 'react';
import classNames from 'classnames';
import styles from './app-search-bar.module.scss';
import { useOutsideClick } from '../../../hooks/useOutsideClick';

export interface SearchResult {
  title: string;
  onclick?: () => void;
}

interface AppSearchResultProps {
  searchResult: SearchResult;
  query: string;
  onClick: () => void;
  disabled?: boolean;
}

const AppSearchResult = ({
  searchResult,
  query,
  onClick,
}: AppSearchResultProps) => {
  const queryIndex = searchResult.title
    .toLowerCase()
    .indexOf(query.toLowerCase());

  return (
    <div
      title="Afficher le détail"
      onClick={() => {
        searchResult.onclick?.();
        onClick();
      }}
    >
      {queryIndex === -1 ? (
        searchResult.title
      ) : (
        <>
          {searchResult.title.substr(0, queryIndex)}
          <b>{searchResult.title.substr(queryIndex, query.length)}</b>
          {searchResult.title.substr(queryIndex + query.length)}
        </>
      )}
    </div>
  );
};

interface Props {
  onSearch: (text: string) => void;
  onKeySearch?: (text: string) => Promise<SearchResult[] | void>;
  placeholder?: string;
  buttonLabel?: string;
  size?: string;
  maxResults?: number;
  initialQuery?: string;
  initialSearch?: boolean;
  disabled?: boolean;
}

const AppSearchBar = ({
  onSearch,
  onKeySearch,
  placeholder,
  buttonLabel,
  size,
  maxResults,
  initialQuery,
  initialSearch,
  disabled,
}: Props) => {
  const [searchInput, setSearchInput] = useState<string>(initialQuery ?? '');
  const [searchResults, setSearchResults] = useState<
    SearchResult[] | undefined
  >();

  const onKeyDown = (e: any) => e.keyCode === 13 && submitSearch(e);

  const onKeyUp = async () => {
    if (onKeySearch) {
      await onKeySearch(searchInput).then((results) => {
        setSearchResults(results ?? undefined);
      });
    }
  };

  const wrapperRef = useRef(null);
  useOutsideClick(wrapperRef, () => setSearchResults(undefined));

  const submitSearch = (e: SubmitEvent) => {
    e.preventDefault();
    onSearch(searchInput);
  };

  useEffect(() => {
    if (initialQuery) {
      setSearchInput(initialQuery.trim());
      if (initialSearch) {
        (async function forceSearch() {
          await onKeyUp();
        })();
      }
    }
  }, [initialQuery, initialSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <form
      role="search"
      data-testid="search-form"
      className={classNames(styles.searchContainer, 'fr-search-bar', {
        'fr-search-bar--lg': size === 'lg',
      })}
      onSubmit={(e: any) => submitSearch(e)}
      ref={wrapperRef}
    >
      <label className="fr-label">{buttonLabel ?? 'Rechercher'}</label>
      <input
        className="fr-input"
        placeholder={placeholder ?? 'Rechercher'}
        type="search"
        data-testid="search-input"
        value={searchInput}
        disabled={disabled}
        onChange={(e) => setSearchInput(e.target.value)}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
      />
      {searchInput.length > 0 && searchResults && (
        <div
          className={
            size === 'lg'
              ? classNames(styles.searchResults, styles.searchResultsLg)
              : styles.searchResults
          }
        >
          {!searchResults.length ? (
            <div className="fr-p-1w">Aucun résultat</div>
          ) : maxResults && searchResults.length > maxResults ? (
            <div className="fr-p-1w">Trop de résultats</div>
          ) : (
            searchResults.map((result, index) => (
              <AppSearchResult
                key={'result_' + index}
                searchResult={result}
                query={searchInput}
                disabled={disabled}
                onClick={() => {
                  setSearchInput(result.title);
                  setSearchResults(undefined);
                }}
              />
            ))
          )}
        </div>
      )}
      <button
        type="submit"
        className={classNames('fr-btn', { 'fr-btn--lg': size === 'lg' })}
        disabled={disabled}
        title="Bouton de recherche"
      >
        {buttonLabel ?? 'Rechercher'}
      </button>
    </form>
  );
};

export default AppSearchBar;
