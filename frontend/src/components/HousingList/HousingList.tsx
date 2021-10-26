import React, { ChangeEvent, useEffect, useState } from 'react';

import { Button, Checkbox, Table, Tag } from '@dataesr/react-dsfr';
import { Housing } from '../../models/Housing';
import { capitalize } from '../../utils/stringUtils';
import styles from './housing-list.module.scss';
import { updateWithValue } from '../../utils/arrayUtils';
import { Link } from 'react-router-dom';

export const maxRecords = 500;

export enum HousingDisplayKey {
    Housing, Owner
}

const HousingList = ({ housingList, displayKind,  onSelect }: { housingList: Housing[], displayKind: HousingDisplayKey, onSelect?: (selectedIds: string[]) => void }) => {

    const [, setPage] = useState(1);
    const [perPage, setPerPage] = useState<number>(50);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    const checkAll = (checked: boolean) => {
        if (checked) {
            setSelectedIds(housingList.map(_ => _.id));
        } else {
            setSelectedIds([]);
        }
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
        render: ({ address, municipality }: Housing) =>
            <>
                <div className="capitalize">{capitalize(address)}</div>
                <div>{capitalize(municipality)}</div>
            </>
    };

    const ownerColumn = {
        name: 'owner',
        label: 'Propriétaire',
        render: ({ ownerFullName }: Housing) => <div className="capitalize">{capitalize(ownerFullName)}</div>
    };

    const tagsColumn = {
        name: 'tags',
        label: 'Caractéristiques',
        render: ({ tags }: Housing) => tags.map(tag => <Tag key={tag}>{tag}</Tag>)
    };

    const statusColumn = {
        name: 'status',
        label: 'Statut',
        render: () => {}
    };

    const viewColumn = {
        name: 'view',
        headerRender: () => '',
        render: ({ ownerId }: Housing) =>
            <Link title="Voir" to={'/proprietaires/' + ownerId} className="ds-fr--inline fr-link">
                Voir<span className="ri-1x icon-right ri-arrow-right-line ds-fr--v-middle" />
            </Link>
    }

    const columns = () => {
        switch (displayKind) {
            case HousingDisplayKey.Housing :
                return [selectColumn, addressColumn, ownerColumn, tagsColumn, viewColumn];
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
                    pagination
                    paginationPosition="center"
                    setPage={setPage}
                    perPage={perPage}
                    fixedLayout={true}
                    className="zlv-table-with-view zlv-table-with-select"
                    data-testid="housing-table"
                />
                <div style={{textAlign: 'center'}}>
                    <Button
                        onClick={() => setPerPage(20)}
                        secondary
                        disabled={perPage === 20}
                        title="title">20 résultats par pages
                    </Button>
                    <Button
                        onClick={() => setPerPage(50)}
                        className="fr-mx-3w"
                        secondary
                        disabled={perPage === 50}
                        title="title">50 résultats par pages
                    </Button>
                    <Button
                        onClick={() => setPerPage(100)}
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

