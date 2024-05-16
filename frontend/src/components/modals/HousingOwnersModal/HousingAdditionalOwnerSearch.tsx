import { Owner } from '../../../models/Owner';
import AppSearchBar from '../../_app/AppSearchBar/AppSearchBar';
import HousingAdditionalOwnerSearchResults from './HousingAdditionalOwnerSearchResults';
import { useAppDispatch, useAppSelector } from '../../../hooks/useStore';
import housingSlice from '../../../store/reducers/housingReducer';

interface Props {
  onSelect: (owner: Owner) => void;
}

const HousingAdditionalOwnerSearch = ({ onSelect }: Props) => {
  const dispatch = useAppDispatch();

  const { additionalOwnersQuery } = useAppSelector((state) => state.housing);

  const searchAdditionalOwners = (q: string) => {
    dispatch(
      housingSlice.actions.fetchingAdditionalOwners({
        ...(additionalOwnersQuery ?? { page: 1, perPage: 5 }),
        q,
      }),
    );
  };

  return (
    <>
      <AppSearchBar
        onSearch={searchAdditionalOwners}
        placeholder="Rechercher un propriétaire dans la base de données"
      />
      <HousingAdditionalOwnerSearchResults onSelect={onSelect} />
    </>
  );
};

export default HousingAdditionalOwnerSearch;
