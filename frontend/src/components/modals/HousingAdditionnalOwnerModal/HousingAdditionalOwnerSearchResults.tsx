import React from 'react';
import { Col, Row } from '../../../components/dsfr/index';
import { format } from 'date-fns';
import { displayCount } from '../../../utils/stringUtils';
import { Owner } from '../../../models/Owner';
import { usePagination } from '../../../hooks/usePagination';
import { useFindOwnersQuery } from '../../../services/owner.service';
import { useAppDispatch, useAppSelector } from '../../../hooks/useStore';
import housingSlice from '../../../store/reducers/housingReducer';
import { Pagination, Table } from '../../dsfr';

interface Props {
  onSelect: (owner: Owner) => void;
}

const HousingAdditionalOwnerSearchResults = ({ onSelect }: Props) => {
  const dispatch = useAppDispatch();
  const { additionalOwnersQuery } = useAppSelector((state) => state.housing);

  const { data: additionalOwners } = useFindOwnersQuery(
    additionalOwnersQuery!,
    { skip: !additionalOwnersQuery }
  );

  const { pageCount, rowNumber, hasPagination } = usePagination({
    count: additionalOwners?.filteredCount,
    perPage: additionalOwners?.perPage,
    page: additionalOwners?.page,
    paginate: true,
  });

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

  if (!additionalOwners || !additionalOwnersQuery) {
    return <></>;
  }

  return (
    <>
      {!additionalOwners.loading && (
        <Row alignItems="middle" className="fr-py-1w">
          <Col>
            <b>
              {displayCount(
                additionalOwners.filteredCount,
                'propriétaire trouvé'
              )}
            </b>
          </Col>
        </Row>
      )}

      {additionalOwners.filteredCount > 0 && (
        <>
          <Table
            caption="Propriétaires"
            captionPosition="none"
            rowKey="id"
            data={additionalOwners.entities.map((_, index) => ({
              ..._,
              rowNumber: rowNumber(index),
            }))}
            columns={columns()}
            fixedLayout={true}
            className="no-head"
          />
          {hasPagination && (
            <div className="fr-react-table--pagination-center nav">
              <Pagination
                onClick={(page: number) =>
                  dispatch(
                    housingSlice.actions.fetchingAdditionalOwners({
                      ...additionalOwnersQuery,
                      page,
                    })
                  )
                }
                currentPage={additionalOwners.page}
                pageCount={pageCount}
              />
            </div>
          )}
        </>
      )}
    </>
  );
};

export default HousingAdditionalOwnerSearchResults;
