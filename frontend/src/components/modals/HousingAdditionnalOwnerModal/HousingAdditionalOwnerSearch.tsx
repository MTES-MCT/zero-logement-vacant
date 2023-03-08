import React from 'react';
import { changeAdditionalOwnersSearching } from '../../../store/actions/housingAction';
import { Owner } from '../../../models/Owner';
import AppSearchBar from '../../AppSearchBar/AppSearchBar';
import HousingAdditionalOwnerSearchResults from './HousingAdditionalOwnerSearchResults';
import { useAppDispatch, useAppSelector } from '../../../hooks/useStore';

interface Props {
  onSelect: (owner: Owner) => void;
}

const HousingAdditionalOwnerSearch = ({ onSelect }: Props) => {
  const dispatch = useAppDispatch();

  const { additionalOwners } = useAppSelector((state) => state.housing);

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
