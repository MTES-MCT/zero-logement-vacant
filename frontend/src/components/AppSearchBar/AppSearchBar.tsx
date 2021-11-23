import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { ApplicationState } from '../../store/reducers/applicationReducers';
import classNames from 'classnames';


const AppSearchBar = ({ onSearch, placeholder, buttonLabel, size }: { onSearch: (text: string) => void, placeholder?: string, buttonLabel?: string, size?: string }) => {

    const { query } = useSelector((state: ApplicationState) => state.housing.filters);

    const [searchInput, setSearchInput] = useState<string>(query);

    const onKeyDown = (e: any) => (e.keyCode === 13) && submitSearch(e);

    const submitSearch = (e: SubmitEvent) => {
        e.preventDefault();
        onSearch(searchInput);
    }

    return (
        <form role="search" data-testid="search-form" className={classNames('fr-search-bar', { 'fr-search-bar--lg': (size === 'lg'), }) } onSubmit={(e: any) => submitSearch(e)}>
            <label className="fr-label">{buttonLabel ?? 'Rechercher'}</label>
            <input className="fr-input"
                   placeholder={placeholder ?? "Rechercher"}
                   type="search"
                   data-testid="search-input"
                   value={searchInput}
                   onChange={(e) => setSearchInput(e.target.value)}
                   onKeyDown={onKeyDown}/>
            <button type="submit"
                    className={classNames('fr-btn', { 'fr-btn--lg': (size === 'lg') })}
                    title="Bouton de recherche">
                {buttonLabel ?? 'Rechercher'}
            </button>
        </form>
    );
};

export default AppSearchBar;

