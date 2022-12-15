import React from 'react';
import { Col, Pagination, Row, Table } from '@dataesr/react-dsfr';
import { useDispatch, useSelector } from 'react-redux';
import { ApplicationState } from '../../../store/reducers/applicationReducers';
import {
  changeAdditionalOwnersPagination,
  changeAdditionalOwnersSearching,
} from '../../../store/actions/housingAction';
import { format } from 'date-fns';
import { displayCount } from '../../../utils/stringUtils';
import { Owner } from '../../../models/Owner';
import AppSearchBar from '../../AppSearchBar/AppSearchBar';

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

  const columns = () => [
    {
      name: 'fullName',
      label: '',
      render: (owner: Owner) => (
        <>
          {owner.fullName}
          {owner.birthDate ? (
            <>
              <br />
              {format(owner.birthDate, 'dd/MM/yyyy')}
            </>
          ) : (
            ''
          )}
          <button
            className="fr-link float-right"
            type="button"
            title="Ajouter"
            onClick={() => onSelect(owner)}
          >
            Ajouter
          </button>
          <br />
          {owner.rawAddress.join(' - ')}
        </>
      ),
    },
  ];

  const pageCount = additionalOwners?.paginatedOwners
    ? Math.ceil(
        additionalOwners.paginatedOwners.totalCount /
          additionalOwners.paginatedOwners.perPage
      )
    : 0;

  return (
    <>
      <AppSearchBar
        onSearch={searchAdditionalOwners}
        placeholder="Rechercher un propriétaire dans la base de données"
      />
      {additionalOwners && additionalOwners.paginatedOwners && (
        <>
          {!additionalOwners.paginatedOwners.loading && (
            <Row alignItems="middle" className="fr-py-1w">
              <Col>
                <b>
                  {displayCount(
                    additionalOwners.paginatedOwners.totalCount,
                    'propriétaire trouvé'
                  )}
                </b>
              </Col>
            </Row>
          )}

          {additionalOwners.paginatedOwners.totalCount > 0 && (
            <>
              <Table
                caption="Propriétaires"
                captionPosition="none"
                rowKey="id"
                data={additionalOwners.paginatedOwners.entities.map(
                  (_, index) => ({
                    ..._,
                    rowNumber:
                      (additionalOwners.paginatedOwners.page - 1) *
                        additionalOwners.paginatedOwners.perPage +
                      index +
                      1,
                  })
                )}
                columns={columns()}
                fixedLayout={true}
                className="no-head"
              />
              {pageCount > 1 && (
                <div className="fr-react-table--pagination-center nav">
                  <Pagination
                    onClick={(page: number) =>
                      dispatch(
                        changeAdditionalOwnersPagination(
                          page,
                          additionalOwners.paginatedOwners.perPage
                        )
                      )
                    }
                    currentPage={additionalOwners.paginatedOwners.page}
                    pageCount={pageCount}
                  />
                </div>
              )}
            </>
          )}
        </>
      )}
    </>
  );
};

export default HousingAdditionalOwnerSearch;
