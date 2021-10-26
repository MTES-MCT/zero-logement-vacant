import React, { ChangeEvent, useEffect, useState } from 'react';

import { Col, Container, Row, Select, Text, TextInput } from '@dataesr/react-dsfr';
import { useDispatch, useSelector } from 'react-redux';
import { filterHousing } from '../../store/actions/housingAction';
import { HousingFilters } from '../../models/Housing';
import { ApplicationState } from '../../store/reducers/applicationReducers';


const HousingListFilter = () => {

    const dispatch = useDispatch();

    const { filters } = useSelector((state: ApplicationState) => state.housing);
    const [housingFilters, setHousingFilters] = useState<HousingFilters>(filters ?? {});
    const [expandFilters, setExpandFilters] = useState<boolean>(false);

    const booleanOptions =  [
        {value: "", label: "Sélectionner", disabled: true, hidden: true},
        {value: "true", label: "Oui"},
        {value: "false", label: "Non"}
    ]

    const emptyOptions = [
        {value: "", label: "Sélectionner", disabled: true, hidden: true}
    ]

    const ownerKindOptions = [
        {value: "", label: "Sélectionner", disabled: true, hidden: true},
        {value: "Particulier", label: "Particulier"},
        {value: "Investisseur", label: "Investisseur"},
        {value: "SCI", label: "SCI"},
        {value: "Autres", label: "Autres"}
    ];

    const ownerAgeOptions = [
        {value: "", label: "Sélectionner", disabled: true, hidden: true},
        {value: "lt35", label: "Moins de 35 ans"},
        {value: "35to65", label: "35 - 65 ans"},
        {value: "gt65", label: "Plus de 65 ans"},
        {value: "gt75", label: "Plus de 75 ans"}
    ];

    const housingKindOptions = [
        {value: "", label: "Sélectionner", disabled: true, hidden: true},
        {value: "APPART", label: "Appartement"},
        {value: "MAISON", label: "Maison"}
    ];

    const housingStateOptions = [
        {value: "", label: "Sélectionner", disabled: true, hidden: true},
        {value: "Inconfortable", label: "Inconfortable"}
    ];

    const housingAreaOptions = [
        {value: "", label: "Sélectionner", disabled: true, hidden: true},
        {value: "lt75", label: "Moins de 75 m2"},
        {value: "75to150", label: "75 - 150 m2"},
        {value: "gt150", label: "Plus de 150 m2"},
    ];

    const vacancyDurationOptions = [
        {value: "", label: "Sélectionner", disabled: true, hidden: true},
        {value: "lt2", label: "Moins de 2 ans"},
        {value: "2to5", label: "2 - 5 ans"},
        {value: "gt5", label: "Plus de 5 ans"},
        {value: "gt10", label: "Plus de 10 ans"}
    ];

    useEffect(() => {
        dispatch(filterHousing(housingFilters));
    }, [housingFilters, dispatch])

    return (
        <Container fluid>
            <div data-testid="owner-filters">
                <Text size="md" className="fr-mb-1w fr-mt-4w">
                    <b>Propriétaire</b>
                </Text>
                <Row gutters>
                    <Col n="2">
                        <Select
                            label="Contacté"
                            options={emptyOptions}
                            selected=""
                            onChange={() => {}}
                        />
                    </Col>
                    <Col n="2">
                        <Select
                            label="Type"
                            options={ownerKindOptions}
                            selected={housingFilters.ownerKind}
                            onChange={(e: ChangeEvent<any>) => setHousingFilters({...housingFilters, ownerKind: e.target.value})}
                            data-testid="owner-kind-filter"
                        />
                    </Col>
                    <Col n="2">
                        <Select
                            label="Âge"
                            options={ownerAgeOptions}
                            selected={housingFilters.ownerAge}
                            onChange={(e: ChangeEvent<any>) => setHousingFilters({...housingFilters, ownerAge: e.target.value})}
                            data-testid="owner-age-filter"
                        />
                    </Col>
                    <Col n="2">
                        <Select
                            label="Multi-propriétaire"
                            options={booleanOptions}
                            selected={housingFilters.multiOwner}
                            onChange={(e: ChangeEvent<any>) => setHousingFilters({...housingFilters, multiOwner: e.target.value === "true" })}
                        />
                    </Col>
                    <Col n="2">
                        <TextInput
                            onChange={(e: ChangeEvent<HTMLInputElement>) => setHousingFilters({...housingFilters, beneficiaryCount: Number(e.target.value)})}
                            label="Nombre d'ayants droit"
                            placeholder="Saisir le nombre"
                            value={housingFilters.beneficiaryCount}
                        />
                    </Col>
                </Row>
            </div>
            {
            <div id="more-filters" className={expandFilters ? 'fr-collapse--expanded' : 'fr-collapse'}>
                <Text size="md" className="fr-mb-1w fr-mt-4w">
                    <b>Logement</b>
                </Text>
                <Row gutters>
                    <Col n="2">
                        <Select
                            label="Type"
                            options={housingKindOptions}
                            selected={housingFilters.housingKind}
                            onChange={(e: ChangeEvent<any>) => setHousingFilters({
                                ...housingFilters,
                                housingKind: e.target.value
                            })}
                            value={housingFilters.housingKind}
                        />
                    </Col>
                    <Col n="2">
                        <Select
                            label="Surface"
                            options={housingAreaOptions}
                            selected={housingFilters.housingArea}
                            onChange={(e: ChangeEvent<any>) => setHousingFilters({
                                ...housingFilters,
                                housingArea: e.target.value
                            })}
                        />
                    </Col>
                    <Col n="2">
                        <Select
                            label="État"
                            options={housingStateOptions}
                            selected={housingFilters.housingState}
                            onChange={(e: ChangeEvent<any>) => setHousingFilters({
                                ...housingFilters,
                                housingState: e.target.value
                            })}
                        />
                    </Col>
                    <Col n="2">
                        <Select
                            label="Date de construction"
                            options={emptyOptions}
                            selected=""
                            onChange={() => {}}
                        />
                    </Col>
                    <Col n="2">
                        <Select
                            label="Durée de vacances"
                            options={vacancyDurationOptions}
                            selected={housingFilters.vacancyDuration}
                            onChange={(e: ChangeEvent<any>) => setHousingFilters({
                                ...housingFilters,
                                vacancyDuration: e.target.value
                            })}
                        />
                    </Col>
                    <Col n="2">
                        <Select
                            label="Taxe"
                            options={emptyOptions}
                            selected=""
                            onChange={() => {}}
                        />
                    </Col>
                </Row>
                <Text size="md" className="fr-mb-1w fr-mt-4w">
                    <b>Emplacement</b>
                </Text>
                <Row gutters>
                    <Col n="2">
                        <Select
                            label="Commune"
                            options={emptyOptions}
                            selected=""
                            onChange={() => {}}
                        />
                    </Col>
                    <Col n="2">
                        <Select
                            label="Périmètre"
                            options={emptyOptions}
                            selected=""
                            onChange={() => {}}
                        />
                    </Col>
                </Row>
            </div>
            }
            <Row gutters>
                <Col className="d-flex fr-grid-row--right">
                    <button
                        className="ds-fr--inline fr-link"
                        type="button"
                        aria-controls="more-filters"
                        aria-expanded={expandFilters}
                        onClick={() => setExpandFilters(!expandFilters)}
                    >
                        {expandFilters
                            ? <><span className="ri-1x icon-left ri-subtract-line ds-fr--v-middle" />Afficher moins de filtres</>
                            : <><span className="ri-1x icon-left ri-add-line ds-fr--v-middle" />Afficher plus de filtres</>
                        }
                    </button>
                </Col>
            </Row>
        </Container>
    );
};

export default HousingListFilter;

