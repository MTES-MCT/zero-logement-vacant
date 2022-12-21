import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ApplicationState } from '../../../store/reducers/applicationReducers';
import { changeAdditionalOwnersSearching } from '../../../store/actions/housingAction';
import { Owner } from '../../../models/Owner';
import AppSearchBar from '../../AppSearchBar/AppSearchBar';
import HousingAdditionalOwnerSearchResults from './HousingAdditionalOwnerSearchResults';

interface Props {
  onSelect: (owner: Owner) => void;
}

const HousingAdditionalOwnerSearch = ({ onSelect }: Props) => {
  const dispatch = useDispatch();

  const { additionalOwners } = useSelector(
    (state: ApplicationState) => state.housing
  );

  const searchAdditionalOwners = (q: string) => {
    dispatch(changeAdditionalOwnersSearching(q));
  };

  return (
    <>
      <AppSearchBar
        onSearch={searchAdditionalOwners}
        placeholder="Rechercher un propriétaire dans la base de données"
      />
      {additionalOwners && additionalOwners.paginatedOwners && (
        <HousingAdditionalOwnerSearchResults
          paginatedOwners={additionalOwners.paginatedOwners}
          onSelect={onSelect}
        />
      )}
    </>
  );
};

export default HousingAdditionalOwnerSearch;
