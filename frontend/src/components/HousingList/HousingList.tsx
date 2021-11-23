import React, { ChangeEvent, useEffect, useState } from 'react';

import { Button, Checkbox, Pagination, Table } from '@dataesr/react-dsfr';
import { Housing } from '../../models/Housing';
import { capitalize } from '../../utils/stringUtils';
import styles from './housing-list.module.scss';
import { updateWithValue } from '../../utils/arrayUtils';
import { Link, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { ApplicationState } from '../../store/reducers/applicationReducers';
import { changePagination } from '../../store/actions/housingAction';


export enum HousingDisplayKey {
    Housing, Owner
}

const HousingList = ({ housingList, displayKind,  onSelect }: { housingList: Housing[], displayKind: HousingDisplayKey, onSelect?: (selectedIds: string[]) => void }) => {

    const dispatch = useDispatch();
    const location = useLocation();

    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    const { totalCount, currentPage, perPage } = useSelector((state: ApplicationState) => state.housing);

    const checkAll = (checked: boolean) => {
        if (checked) {
            setSelectedIds(housingList.map(_ => _.id));
        } else {
            setSelectedIds([]);
        }
    }

    const changePerPage = (perPage: number) => {
        dispatch(changePagination(1, perPage));
    }

    const changePage = (page: number) => {
        dispatch(changePagination(page, perPage));
    }

    useEffect(() => {
        if (onSelect) {
            onSelect(selectedIds);
        }
    }, [selectedIds, onSelect]);


    useEffect(() => {
        setSelectedIds([]);
    }, [housingList])

    const selectColumn = {
        name: 'select',
        headerRender: () =>
            <Checkbox onChange={(e: ChangeEvent<any>) => checkAll(e.target.checked)}
                      className={selectedIds.length > 0 && selectedIds.length < housingList.length ? styles.indeterminate : ''}
                      label="">
            </Checkbox>,
        render: ({ id }: Housing) =>
            <Checkbox value={id}
                      onChange={(e: ChangeEvent<any>) => setSelectedIds(updateWithValue(selectedIds, e.target.value, e.target.checked))}
                      checked={selectedIds.indexOf(id) !== -1}
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
        render: ({ owner }: Housing) => <div className="capitalize">{capitalize(owner.fullName)}</div>
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
            <Link title="Voir" to={location.pathname + '/proprietaires/' + owner.id} className="ds-fr--inline fr-link">
                Voir<span className="ri-1x icon-right ri-arrow-right-line ds-fr--v-middle" />
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
            { housingList && housingList.length > 0 && <>
                <Table
                    caption="Logements"
                    captionPosition="none"
                    rowKey="id"
                    data={housingList}
                    columns={columns()}
                    fixedLayout={true}
                    className="zlv-table-with-view zlv-table-with-select"
                    data-testid="housing-table"
                />
                <div className="fr-react-table--pagination-center nav">
                    <Pagination onClick={changePage}
                                currentPage={currentPage}
                                pageCount={Math.ceil(totalCount / perPage)}/>
                </div>
                <div style={{textAlign: 'center'}}>
                    <Button
                        onClick={() => changePerPage(20)}
                        secondary
                        disabled={perPage === 20}
                        title="title">20 résultats par pages
                    </Button>
                    <Button
                        onClick={() => changePerPage(50)}
                        className="fr-mx-3w"
                        secondary
                        disabled={perPage === 50}
                        title="title">50 résultats par pages
                    </Button>
                    <Button
                        onClick={() => changePerPage(100)}
                        secondary
                        disable={perPage === 100}
                        title="title">100 résultats par pages
                    </Button>
                </div>
            </>}
        </>
    );
};

export default HousingList;

