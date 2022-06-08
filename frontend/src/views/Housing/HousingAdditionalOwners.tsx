import React, { useEffect, useState } from 'react';
import { Col, Pagination, Row, Select, Table, Text } from '@dataesr/react-dsfr';
import { useDispatch, useSelector } from 'react-redux';
import { ApplicationState } from '../../store/reducers/applicationReducers';
import {
    changeAdditionalOwnersPagination,
    changeAdditionalOwnersSearching,
    createAdditionalOwner,
    updateHousingOwners,
} from '../../store/actions/housingAction';
import { format } from 'date-fns';
import { displayCount } from '../../utils/stringUtils';
import { DraftOwner, HousingOwner, Owner } from '../../models/Owner';
import AppSearchBar from '../../components/AppSearchBar/AppSearchBar';
import { SelectOption } from '../../models/SelectOption';
import OwnerEditionModal from '../../components/modals/OwnerEditionModal/OwnerEditionModal';

const HousingAdditionalOwners = ({ housingId, housingOwners } : { housingId: string, housingOwners: HousingOwner[] }) => {

    const dispatch = useDispatch();

    const { additionalOwners, additionalOwner } = useSelector((state: ApplicationState) => state.housing);
    const [additionalOwnerRank, setAdditionalOwnerRank] = useState<string>('1');
    const [isModalOwnerOpen, setIsModalOwnerOpen] = useState(false);

    const searchAdditionalOwners = (q: string) => {
        dispatch(changeAdditionalOwnersSearching(q))
    }

    const createDraftOwner = (draftOwner: DraftOwner) => {
        dispatch(createAdditionalOwner(draftOwner));
        setIsModalOwnerOpen(false);
    }

    const ownerRankOptions: SelectOption[] = [
        {value: '1', label: `Propriétaire principal`},
        ...Array.from(Array(housingOwners.filter(_ => _.rank).length).keys()).map(_ => (
            {value: String(_ + 2), label: (_ + 2) + 'ème ayant droit'}
        )),
        {value: '0', label: `Ancien propriétaire`}
    ]

    const onAddingOwner = (owner: Owner) => {
        const ownerRank = Number(additionalOwnerRank)
        dispatch(updateHousingOwners(housingId, [
            ...(housingOwners ?? []).map(ho => ({
                ...ho,
                rank : (ownerRank && ownerRank <= ho.rank) ? ho.rank + 1 : ho.rank
            })),
            {
                ...owner,
                housingId: housingId,
                rank: ownerRank,
                startDate: ownerRank ? (new Date()): undefined,
                endDate: !ownerRank ? (new Date()): undefined,
                origin: 'ZLV'
            }
        ]))
    }

    useEffect(() => {
        if (additionalOwner && !housingOwners.find(ho => ho.id === additionalOwner.id)) {
            onAddingOwner(additionalOwner)
        }
    }, [additionalOwner])

    const columns = () => [{
        name: 'fullName',
        label: '',
        render: (owner: Owner) =>
            <>
                {owner.fullName}
                {owner.birthDate ? <><br />{format(owner.birthDate, 'dd/MM/yyyy')}</> : ''}
                <button
                    className="fr-link float-right"
                    type="button"
                    title="Ajouter"
                    onClick={() => onAddingOwner(owner)}>
                    Ajouter
                </button>
                <br />
                {owner.rawAddress.join(' - ')}
            </>
    }];

    return (
        <>
            <Text size="lg" className="fr-mb-1w">
                <b>Ajout d&apos;un propriétaire</b>
            </Text>
            <div>

                <Select options={ownerRankOptions}
                        selected={additionalOwnerRank}
                        onChange={(e: any) => setAdditionalOwnerRank(e.target.value)}
                        className="fr-pt-2w"/>

                <div className="fr-pb-2w">
                    <AppSearchBar onSearch={searchAdditionalOwners}/>
                </div>

                {additionalOwners && additionalOwners.paginatedOwners && <>

                    {!additionalOwners.paginatedOwners.loading &&
                        <Row alignItems="middle" className="fr-py-1w">
                            <Col>
                                <b>{displayCount(additionalOwners.paginatedOwners.totalCount, 'propriétaire trouvé')}</b>
                            </Col>
                        </Row>
                    }

                    {additionalOwners.paginatedOwners.totalCount > 0 &&
                        <>
                            <Table caption="Propriétaires"
                                   captionPosition="none"
                                   rowKey="id"
                                   data={additionalOwners.paginatedOwners.entities.map((_, index) => ({..._, rowNumber: (additionalOwners.paginatedOwners.page - 1) * additionalOwners.paginatedOwners.perPage + index + 1}) )}
                                   columns={columns()}
                                   fixedLayout={true}/>
                            <div className="fr-react-table--pagination-center nav">
                            <Pagination onClick={(page: number) => dispatch(changeAdditionalOwnersPagination(page, additionalOwners.paginatedOwners.perPage))}
                                        currentPage={additionalOwners.paginatedOwners.page}
                                        pageCount={Math.ceil(additionalOwners.paginatedOwners.totalCount / additionalOwners.paginatedOwners.perPage)}/>
                            </div>
                        </>

                    }

                </>}

                <button
                    className="fr-link fr-pl-0"
                    type="button"
                    title="Créer un nouveau propriétaire"
                    onClick={() => setIsModalOwnerOpen(true)}>
                    Créer un nouveau propriétaire
                </button>
                {isModalOwnerOpen &&
                    <OwnerEditionModal onCreate={createDraftOwner}
                                       onClose={() => setIsModalOwnerOpen(false)} />
                }
            </div>
        </>
    );
};

export default HousingAdditionalOwners;

