import React, { ChangeEvent, useState } from 'react';

import { Button, Checkbox, Pagination, Table } from '@dataesr/react-dsfr';
import { Housing } from '../../models/Housing';
import { capitalize } from '../../utils/stringUtils';
import { updateWithValue } from '../../utils/arrayUtils';
import { Link, useLocation } from 'react-router-dom';
import { PaginatedResult } from '../../models/PaginatedResult';


export enum HousingDisplayKey {
    Housing, Owner
}

const HousingList = (
    {
        paginatedHousing,
        onChangePagination,
        displayKind,
        checkedIds,
        onCheckId
    }: {
        paginatedHousing: PaginatedResult<Housing>,
        onChangePagination: (page: number, perPage: number) => void,
        displayKind: HousingDisplayKey,
        checkedIds?: string[],
        onCheckId?: (selectedIds: string[]) => void,
        onCheckAll?: (selected: boolean) => void,
    }) => {

    const location = useLocation();

    const [allChecked, setAllChecked] = useState<boolean>(false);

    const checkAll = (checked: boolean) => {
        setAllChecked(checked);
    }

    const checkOne = (id: string, checked: boolean) => {
        const updatedCheckIds = updateWithValue(checkedIds, id, checked)
        if (onCheckId) {
            onCheckId(updatedCheckIds)
        }
    }

    const changePerPage = (perPage: number) => {
        onChangePagination(1, perPage)
    }

    const changePage = (page: number) => {
        onChangePagination(page, paginatedHousing.perPage)
    }

    const selectColumn = {
        name: 'select',
        headerRender: () =>
            <Checkbox onChange={(e: ChangeEvent<any>) => checkAll(e.target.checked)}
                      checked={allChecked}
                      // className={!allChecked && checkedIds?.length < paginatedHousing.totalCount ? styles.indeterminate : ''}
                      label="">
            </Checkbox>,
        render: ({ id }: Housing) =>
            <Checkbox value={id}
                      onChange={(e: ChangeEvent<any>) => checkOne(e.target.value, e.target.checked)}
                      checked={allChecked || checkedIds?.indexOf(id) !== -1}
                      data-testid={'housing-check-' + id}
                      label="">
            </Checkbox>
    };

    const addressColumn = {
        name: 'address',
        label: 'Adresse',
        render: ({ id, rawAddress }: Housing) =>
            <>
                {rawAddress.map((line, lineIdx) =>
                    <div key={id + '-rawAddress-' + lineIdx} className="capitalize">{capitalize(line)}</div>
                )}
            </>
    };

    const ownerColumn = {
        name: 'owner',
        label: 'Propriétaire',
        render: ({ owner }: Housing) => <div>{owner.fullName}</div>
    };

    const ownerAddressColumn = {
        name: 'ownerAddress',
        label: 'Adresse du propriétaire',
        render: ({ owner }: Housing) =>
            <>
                {owner.rawAddress.map((line, lineIdx) =>
                    <div key={owner.id + '-rawAddress-' + lineIdx} className="capitalize">{capitalize(line)}</div>
                )}
            </>
    };

    const campaignColumn = {
        name: 'campaign',
        label: 'Campagne',
        render: () => <></>
    };

    const statusColumn = {
        name: 'status',
        label: 'Statut',
        render: () => {}
    };

    const viewColumn = {
        name: 'view',
        headerRender: () => '',
        render: ({ owner }: Housing) =>
            <Link title="Afficher" to={location.pathname + '/proprietaires/' + owner.id} className="ds-fr--inline fr-link">
                Afficher<span className="ri-1x icon-right ri-arrow-right-line ds-fr--v-middle" />
            </Link>
    }

    const columns = () => {
        switch (displayKind) {
            case HousingDisplayKey.Housing :
                return [selectColumn, addressColumn, ownerColumn, ownerAddressColumn, campaignColumn, viewColumn];
            case HousingDisplayKey.Owner :
                return [selectColumn, ownerColumn, { ...addressColumn, label: 'Logement' }, statusColumn, viewColumn];
        }
    }

    return (
        <>
            { paginatedHousing.entities?.length > 0 && <>
                <Table
                    caption="Logements"
                    captionPosition="none"
                    rowKey="id"
                    data={paginatedHousing.entities}
                    columns={columns()}
                    fixedLayout={true}
                    className="zlv-table-with-view zlv-table-with-select"
                    data-testid="housing-table"
                />
                <div className="fr-react-table--pagination-center nav">
                    <Pagination onClick={changePage}
                                currentPage={paginatedHousing.page}
                                pageCount={Math.ceil(paginatedHousing.totalCount / paginatedHousing.perPage)}/>
                </div>
                <div style={{textAlign: 'center'}}>
                    <Button
                        onClick={() => changePerPage(20)}
                        secondary
                        disabled={paginatedHousing.perPage === 20}
                        title="title">20 résultats par pages
                    </Button>
                    <Button
                        onClick={() => changePerPage(50)}
                        className="fr-mx-3w"
                        secondary
                        disabled={paginatedHousing.perPage === 50}
                        title="title">50 résultats par pages
                    </Button>
                    <Button
                        onClick={() => changePerPage(100)}
                        secondary
                        disable={paginatedHousing.perPage === 100}
                        title="title">100 résultats par pages
                    </Button>
                </div>
            </>}
        </>
    );
};

export default HousingList;

