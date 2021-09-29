import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { searchHousing } from '../../store/actions/housingAction';


const HousingSearchBar = () => {

    const dispatch = useDispatch();

    const [text, setText] = useState<string>('');
    const [search, setSearch] = useState<string>('');

    const onKeyDown = (e: any) => (e.keyCode === 13) && setSearch(text);

    const submitSearch = (e: SubmitEvent) => {
        e.preventDefault();
        setSearch(text);
    }

    useEffect(() => {
        dispatch(searchHousing(search));
    }, [search, dispatch])

    return (
        <form role="search" data-testid="search-form" className="fr-search-bar fr-my-2w" onSubmit={(e: any) => submitSearch(e)}>
            <label className="fr-label">Rechercher</label>
            <input className="fr-input"
                   placeholder="Rechercher"
                   type="search"
                   data-testid="search-input"
                   onChange={(e) => setText(e.target.value)}
                   onKeyDown={onKeyDown}/>
            <button type="submit" className="fr-btn" title="Boutton de recherche">Boutton de recherche</button>
        </form>
    );
};

export default HousingSearchBar;

