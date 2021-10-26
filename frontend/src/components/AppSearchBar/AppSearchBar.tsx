import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { ApplicationState } from '../../store/reducers/applicationReducers';


const AppSearchBar = ({ onSearch }: { onSearch: (text: string) => void }) => {

    const { search } = useSelector((state: ApplicationState) => state.housing);

    const [searchInput, setSearchInput] = useState<string>(search);

    const onKeyDown = (e: any) => (e.keyCode === 13) && submitSearch(e);

    const submitSearch = (e: SubmitEvent) => {
        e.preventDefault();
        onSearch(searchInput);
    }

    return (
        <form role="search" data-testid="search-form" className="fr-search-bar" onSubmit={(e: any) => submitSearch(e)}>
            <label className="fr-label">Rechercher</label>
            <input className="fr-input"
                   placeholder="Rechercher"
                   type="search"
                   data-testid="search-input"
                   value={searchInput}
                   onChange={(e) => setSearchInput(e.target.value)}
                   onKeyDown={onKeyDown}/>
            <button type="submit" className="fr-btn" title="Boutton de recherche">Boutton de recherche</button>
        </form>
    );
};

export default AppSearchBar;

