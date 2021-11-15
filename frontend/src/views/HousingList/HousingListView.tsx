import React, { useState } from 'react';

import { Button, Col, Container, Row, Text, Title } from '@dataesr/react-dsfr';
import { useDispatch, useSelector } from 'react-redux';
import { ApplicationState } from '../../store/reducers/applicationReducers';
import HousingListFilter from './HousingListFilter';
import HousingList, { HousingDisplayKey, maxRecords } from '../../components/HousingList/HousingList';
import AppSearchBar from '../../components/AppSearchBar/AppSearchBar';
import { filterHousing, searchHousing } from '../../store/actions/housingAction';
import { createCampaign } from '../../store/actions/campaignAction';
import CampaignCreationModal from '../../components/modals/CampaignCreationModal/CampaignCreationModal';
import AppBreadcrumb from '../../components/AppBreadcrumb/AppBreadcrumb';
import {
    beneficiaryCountOptions,
    constructionPeriodOptions,
    contactsCountOptions,
    housingAreaOptions,
    HousingFilterOption,
    housingKindOptions,
    housingStateOptions,
    ownerAgeOptions,
    ownerKindOptions,
    vacancyDurationOptions,
} from '../../models/HousingFilters';


const HousingListView = () => {

    const dispatch = useDispatch();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedHousingIds, setSelectedHousingIds] = useState<string[]>([]);

    const { housingList, filters } = useSelector((state: ApplicationState) => state.housing);

    const create = (campaignName: string) => {
        dispatch(createCampaign(campaignName, selectedHousingIds))
        setIsModalOpen(false)
    }

    const getDistinctOwners = () => {return housingList
        .filter(housing => selectedHousingIds.indexOf(housing.id) !== -1)
        .map(housing => housing.ownerId)
        .filter((id, index, array) => array.indexOf(id) === index)
    }

    const removeFilter = (removedFilter: any) => {
        console.log('removedFilter', removedFilter)
        dispatch(filterHousing({
            ...filters,
            ...removedFilter
        }));
    }

    const FilterBadges = ({options, filters, onChange}: {options: HousingFilterOption[], filters: string[], onChange: (_: string[]) => void}) => {
        return (
            <>
                {options.filter(o => filters.indexOf(o.value) !== -1).map((option, index) =>
                    <span className="fr-tag fr-tag--sm fr-fi-icon" key={option + '-' + index}>
                        {option.badgeLabel ?? option.label}
                        <button className="ri-md ri-close-line fr-pr-0"
                                onClick={() => {
                                    onChange(filters.filter(v => v !== option.value))
                                }}>
                        </button>
                    </span>
                )}
            </>
        )
    }

    return (
        <>
            <div className="bg-100">
                <Container spacing="pb-1w">
                    <AppBreadcrumb />
                    <Row>
                        <Col n="8">
                            <Title as="h1">Base de données</Title>
                        </Col>
                        <Col n="4">
                            <AppSearchBar onSearch={(input: string) => {dispatch(searchHousing(input))}} />
                        </Col>
                    </Row>
                    <Row>
                        <Col>
                            <HousingListFilter />
                        </Col>
                    </Row>
                </Container>
            </div>
            <Container spacing="pt-2w">
                <Row>
                    { filters &&
                        <>
                            <FilterBadges options={ownerKindOptions}
                                          filters={filters.ownerKinds}
                                          onChange={(values) => removeFilter({ownerKinds: values})}/>
                            <FilterBadges options={ownerAgeOptions}
                                          filters={filters.ownerAges}
                                          onChange={(values) => removeFilter({ownerAges: values})}/>
                            <FilterBadges options={beneficiaryCountOptions}
                                          filters={filters.beneficiaryCounts}
                                          onChange={(values) => removeFilter({beneficiaryCounts: values})}/>
                            <FilterBadges options={housingKindOptions}
                                          filters={filters.housingKinds}
                                          onChange={(values) => removeFilter({housingKinds: values})}/>
                            <FilterBadges options={contactsCountOptions}
                                          filters={filters.contactsCounts}
                                          onChange={(values) => removeFilter({contactsCounts: values})}/>
                            <FilterBadges options={housingAreaOptions}
                                          filters={filters.housingAreas}
                                          onChange={(values) => removeFilter({housingAreas: values})}/>
                            <FilterBadges options={housingStateOptions}
                                          filters={filters.housingStates}
                                          onChange={(values) => removeFilter({housingStates: values})}/>
                            <FilterBadges options={constructionPeriodOptions}
                                          filters={filters.constructionPeriods}
                                          onChange={(values) => removeFilter({constructionPeriods: values})}/>
                            <FilterBadges options={vacancyDurationOptions}
                                          filters={filters.vacancyDurations}
                                          onChange={(values) => removeFilter({vacancyDurations: values})}/>
                        </>
                    }
                </Row>
                {housingList &&
                    <>
                        <Row alignItems="middle" className="fr-pb-1w">
                            <Col>
                                {housingList.length > 0
                                    ? <Text
                                        className="fr-my-2w"><b>{housingList.length >= maxRecords ? 'Plus de ' + maxRecords : housingList.length}</b> logements</Text>
                                    : <Text className="fr-my-2w"><b>Aucun logement</b></Text>
                                }
                            </Col>
                            {housingList.length > 0 &&
                            <Col>
                                <Button title="Créer la campagne"
                                        onClick={() => setIsModalOpen(true)}
                                        data-testid="create-campaign-button"
                                        disabled={selectedHousingIds.length === 0}
                                        className="float-right">
                                    Créer la campagne
                                </Button>
                                {isModalOpen &&
                                <CampaignCreationModal housingCount={selectedHousingIds.length}
                                                       ownerCount={getDistinctOwners().length}
                                                       onSubmit={(campaignName: string) => create(campaignName)}
                                                       onClose={() => setIsModalOpen(false)}/>}
                            </Col>
                            }
                        </Row>
                        <HousingList housingList={housingList}
                                     displayKind={HousingDisplayKey.Housing}
                                     onSelect={(ids: string[]) => setSelectedHousingIds(ids)}/>
                    </>
                }
            </Container>
        </>
    );
};

export default HousingListView;

