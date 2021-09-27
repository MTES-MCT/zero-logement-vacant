import React, { ChangeEvent, useEffect, useState } from 'react';

import {
    Button,
    Checkbox,
    Col,
    Container,
    Link,
    Row,
    SideMenu,
    SideMenuItem,
    Table,
    Text,
    Title,
} from '@dataesr/react-dsfr';
import { useDispatch, useSelector } from 'react-redux';
import { ApplicationState } from '../../store/reducers/applicationReducers';
import { listHousing } from '../../store/actions/housingAction';
import { Housing } from '../../models/Housing';
import { capitalize } from '../../utils/stringUtils';
import LoadingBar from 'react-redux-loading-bar';
import styles from './HousingView.module.scss';


const HousingView = () => {

    const dispatch = useDispatch();

    const maxRecords = 500;

    const [filters, setFilters] = useState<{ ownerKinds?: string[] }>({});
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState<number>(50);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    const { housingList } = useSelector((state: ApplicationState) => state.housing);

    useEffect(() => {
        setSelectedIds([]);
        dispatch(listHousing(filters.ownerKinds));
    }, [filters, dispatch])

    useEffect(() => {
        console.log('selectedIds.length', selectedIds.length)
    }, [selectedIds])

    const changeOwnerKindsFilter = (value: string, checked: boolean) => {
        setFilters({ ownerKinds: changeList(filters.ownerKinds, value, checked) });
    }

    function changeList<Type> (list: Type[] = [], value: Type, checked: boolean): Type[] {
        const valueIndex = list.indexOf(value);
        if (checked && valueIndex === -1) {
            return [...list, value];
        } else if (!checked && valueIndex !== -1) {
            return list.filter(f => f !== value);
        }
        return list;
    }

    const currentPageIds = (checked: boolean) => {
        if (checked) {
            return housingList.map(_ => _.id).slice((page - 1) * perPage, page * perPage);
        } else {
            return[];
        }
    }

    const columns: any[] = [
        {
            name: 'select',
            headerRender: () =>
                <Checkbox onChange={(e: ChangeEvent<any>) => setSelectedIds(currentPageIds(e.target.checked))}
                          className={selectedIds.length > 0 && selectedIds.length < perPage ? styles.indeterminate : ''}
                          label="">
                </Checkbox>,
            render: ({ id }: Housing) =>
                <Checkbox value={id}
                          onChange={(e: ChangeEvent<any>) => setSelectedIds(changeList(selectedIds, e.target.value, e.target.checked))}
                          checked={selectedIds.indexOf(id) !== -1}
                          label="">
                </Checkbox>
        },
        {
            name: 'address',
            label: 'Adresse',
            render: ({ address, id }: Housing) =>
                address.map((_, i) => <div key={id + '_address_' + i}>{capitalize(_)}</div>)
        },
        {
            name: 'owner',
            label: 'Propriétaire',
            render: ({ owner }: Housing) => capitalize(owner)
        },
        {
            name: 'tags',
            label: 'Caractéristiques',
            render: ({ tags }: Housing) => ''
        },
        {
            name: 'view',
            headerRender: () => '',
            render: ({ id }: Housing) =>
                <Link title="Voir" href="/" isSimple icon="ri-arrow-right-line">Voir</Link>
        }
    ];

    return (
        <>
            <Container spacing="py-4w">
                <Title as="h1">Tous les logements</Title>
                <Row className="fr-grid-row--center">
                    <Col n="2">
                        <SideMenu title="Filtres" buttonLabel="filters">
                            <SideMenuItem title="Propriétaires" data-testid="owners-filter">
                                <Checkbox
                                    value="Particulier"
                                    onChange={(e: ChangeEvent<any>) => changeOwnerKindsFilter(e.target.value, e.target.checked)}
                                    label="Particulier"
                                    data-testid="owners-filter1"
                                />
                                <Checkbox
                                    value="Investisseur"
                                    onChange={(e: ChangeEvent<any>) => changeOwnerKindsFilter(e.target.value, e.target.checked)}
                                    label="Investisseur"
                                    data-testid="owners-filter2"
                                />
                                <Checkbox
                                    value="SCI"
                                    onChange={(e: ChangeEvent<any>) => changeOwnerKindsFilter(e.target.value, e.target.checked)}
                                    label="SCI"
                                />
                                <Checkbox
                                    value="Autres"
                                    onChange={(e: ChangeEvent<any>) => changeOwnerKindsFilter(e.target.value, e.target.checked)}
                                    label="Autres"
                                />
                            </SideMenuItem>
                        </SideMenu>


                    </Col>
                    <Col>
                        <LoadingBar className={styles.loading} updateTime={100} maxProgress={100} progressIncrease={10}/>
                        <Text className="fr-mb-2w">
                            <b>{housingList.length >= maxRecords ? 'Plus de ' + maxRecords : housingList.length }</b> logements
                        </Text>
                        { housingList && housingList.length > 0 &&
                            <Table
                                caption="Logements"
                                captionPosition="none"
                                rowKey="id"
                                data={housingList}
                                columns={columns}
                                pagination
                                paginationPosition="center"
                                setPage={setPage} page={page}
                                perPage={perPage}
                                fixedLayout={true}
                                className="zlv-table-with-view zlv-table-with-select"
                            />
                        }
                        <div style={{textAlign: 'center'}}>
                            <Button
                                onClick={() => setPerPage(50)}
                                secondary
                                disabled={perPage === 50}
                                title="title">50 résultats par pages
                            </Button>
                            <Button
                                onClick={() => setPerPage(100)}
                                className="fr-mx-3w"
                                secondary
                                disabled={perPage === 100}
                                title="title">100 résultats par pages
                            </Button>
                            <Button
                                onClick={() => setPerPage(200)}
                                secondary
                                disable={perPage === 200}
                                title="title">200 résultats par pages
                            </Button>
                        </div>
                    </Col>
                </Row>
            </Container>
        </>
    );
};

export default HousingView;

