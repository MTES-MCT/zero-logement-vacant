import React, { ChangeEvent, useEffect, useState } from 'react';

import { Button, Checkbox, Pagination, Table } from '@dataesr/react-dsfr';
import { Housing, SelectedHousing } from '../../models/Housing';
import { capitalize } from '../../utils/stringUtils';
import { Link, useLocation } from 'react-router-dom';
import { PaginatedResult } from '../../models/PaginatedResult';
import styles from './housing-list.module.scss';
import { HousingFilters } from '../../models/HousingFilters';
import { useDispatch, useSelector } from 'react-redux';
import { ApplicationState } from '../../store/reducers/applicationReducers';
import { listCampaigns } from '../../store/actions/campaignAction';


export enum HousingDisplayKey {
    Housing, Owner
}

const HousingList = (
    {
        paginatedHousing,
        onChangePagination,
        filters,
        displayKind,
        onSelectHousing,
    }: {
        paginatedHousing: PaginatedResult<Housing>,
        onChangePagination: (page: number, perPage: number) => void,
        filters?: HousingFilters,
        displayKind: HousingDisplayKey,
        onSelectHousing?: (selectedHousing: SelectedHousing) => void
    }) => {

    const dispatch = useDispatch();
    const location = useLocation();

    const [checkedIds, setCheckedIds] = useState<string[]>([]);
    const [allChecked, setAllChecked] = useState<boolean>(false);

    const { campaignList } = useSelector((state: ApplicationState) => state.campaign);

    const checkAll = (checked: boolean) => {
        const selectedHousing = {all: checked, ids: []}
        setAllChecked(selectedHousing.all);
        setCheckedIds(selectedHousing.ids);
        if (onSelectHousing) {
            onSelectHousing(selectedHousing)
        }
    }

    const checkOne = (id: string) => {
        const updatedCheckIds = (checkedIds.indexOf(id) === -1) ? [...checkedIds, id] : checkedIds.filter(f => f !== id)
        setCheckedIds(updatedCheckIds)
        if (onSelectHousing) {
            onSelectHousing({all: allChecked, ids: updatedCheckIds})
        }
    }

    useEffect(() => {
        if (!campaignList) {
            dispatch(listCampaigns());
        }
    }, [dispatch])

    useEffect(() => {
        if (filters) {
            setAllChecked(false)
            setCheckedIds([])
            if (onSelectHousing) {
                onSelectHousing({all: false, ids: []})
            }
        }
    }, [filters])

    const changePerPage = (perPage: number) => {
        onChangePagination(1, perPage)
    }

    const changePage = (page: number) => {
        onChangePagination(page, paginatedHousing.perPage)
    }

    const selectColumn = {
        name: 'select',
        headerRender: () =>
            <>
                {onSelectHousing && filters &&
                    <Checkbox onChange={(e: ChangeEvent<any>) => checkAll(e.target.checked)}
                    checked={(allChecked && checkedIds.length === 0) || (!allChecked && checkedIds.length === paginatedHousing.totalCount)}
                    className={checkedIds.length !== 0 ? styles.indeterminate : ''}
                    label="">
                    </Checkbox>
                }
            </>,
        render: ({ id }: Housing) =>
            <>
                {onSelectHousing &&
                <Checkbox value={id}
                          onChange={(e: ChangeEvent<any>) => checkOne(e.target.value)}
                          checked={(allChecked && checkedIds.indexOf(id) === -1) || (!allChecked && checkedIds.indexOf(id) !== -1)}
                          data-testid={'housing-check-' + id}
                          label="">
                </Checkbox>
                }
            </>
    };

    const rowNumberColumn = {
        name: 'number',
        render: ({ rowNumber }: any) => <>#{rowNumber}</>
    }

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
        render: ({ campaignIds, id } : Housing) =>
            <>
                {campaignIds?.length ?
                    campaignIds.map(campaignId =>
                        <div key={id + '-campaign-' + campaignId}>
                            {campaignList?.find(c => c.id === campaignId)?.name}
                        </div>
                    ) :
                    'Jamais contacté'
                }
            </>
    };

    const statusColumn = {
        name: 'status',
        label: 'Statut',
        render: () => <div className={styles.statusLabel}>En attente de retour</div>
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
                return [selectColumn, rowNumberColumn, addressColumn, ownerColumn, ownerAddressColumn, campaignColumn, viewColumn];
            case HousingDisplayKey.Owner :
                return [selectColumn, rowNumberColumn, ownerColumn, { ...addressColumn, label: 'Logement' }, statusColumn, viewColumn];
        }
    }

    return (
        <>
            { paginatedHousing.entities?.length > 0 && <>
                <Table
                    caption="Logements"
                    captionPosition="none"
                    rowKey="id"
                    data={paginatedHousing.entities.map((_, index) => ({..._, rowNumber: (paginatedHousing.page - 1) * paginatedHousing.perPage + index + 1}) )}
                    columns={columns()}
                    fixedLayout={true}
                    className="zlv-table-with-view with-select with-row-number"
                    data-testid="housing-table"
                />
                <div className="fr-react-table--pagination-center nav">
                    <Pagination onClick={changePage}
                                currentPage={paginatedHousing.page}
                                pageCount={Math.ceil(paginatedHousing.totalCount / paginatedHousing.perPage)}/>
                </div>
                <div style={{textAlign: 'center'}}>
                    <Button
                        onClick={() => changePerPage(50)}
                        secondary
                        disabled={paginatedHousing.perPage === 50}
                        title="title">50 résultats par page
                    </Button>
                    <Button
                        onClick={() => changePerPage(100)}
                        className="fr-mx-3w"
                        secondary
                        disabled={paginatedHousing.perPage === 100}
                        title="title">100 résultats par page
                    </Button>
                    <Button
                        onClick={() => changePerPage(200)}
                        secondary
                        disable={paginatedHousing.perPage === 200}
                        title="title">200 résultats par page
                    </Button>
                </div>
            </>}
        </>
    );
};

export default HousingList;

