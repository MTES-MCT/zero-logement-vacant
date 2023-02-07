import React from 'react';
import { Col, Pagination, Row, Table } from '@dataesr/react-dsfr';
import { useDispatch } from 'react-redux';
import { changeAdditionalOwnersPagination } from '../../../store/actions/housingAction';
import { format } from 'date-fns';
import { displayCount } from '../../../utils/stringUtils';
import { Owner } from '../../../models/Owner';
import { usePagination } from '../../../hooks/usePagination';
import { PaginatedResult } from '../../../models/PaginatedResult';

interface Props {
  paginatedOwners: PaginatedResult<Owner>;
  onSelect: (owner: Owner) => void;
}

const HousingAdditionalOwnerSearchResults = ({
  paginatedOwners,
  onSelect,
}: Props) => {
  const dispatch = useDispatch();

  const { pageCount, rowNumber, hasPagination } =
    usePagination(paginatedOwners);

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

  return (
    <>
      {!paginatedOwners.loading && (
        <Row alignItems="middle" className="fr-py-1w">
          <Col>
            <b>
              {displayCount(
                paginatedOwners.filteredCount,
                'propriétaire trouvé'
              )}
            </b>
          </Col>
        </Row>
      )}

      {paginatedOwners.filteredCount > 0 && (
        <>
          <Table
            caption="Propriétaires"
            captionPosition="none"
            rowKey="id"
            data={paginatedOwners.entities.map((_, index) => ({
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
                    changeAdditionalOwnersPagination(
                      page,
                      paginatedOwners.perPage
                    )
                  )
                }
                currentPage={paginatedOwners.page}
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
