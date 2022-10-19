import React from 'react';

import { Alert, Col, Container, Link, Row, Title } from '@dataesr/react-dsfr';
import AppBreadcrumb from '../../components/AppBreadcrumb/AppBreadcrumb';
import { HousingStates, HousingStatus } from '../../models/HousingState';
import classNames from 'classnames';

const ResourcesView = () => {

    const housingStatesSorted = [
        ...HousingStates.slice(0, HousingStates.findIndex(_ => _.status === HousingStatus.NotVacant)),
        HousingStates.find(_ => _.status === HousingStatus.Exit)!,
        ...HousingStates.slice(HousingStates.findIndex(_ => _.status === HousingStatus.NotVacant), HousingStates.findIndex(_ => _.status === HousingStatus.Exit))
    ]

    return (
        <>
            <div className="bg-100">
                <Container spacing="pb-1w">
                    <AppBreadcrumb />
                    <Row>
                        <Col n="8">
                            <Title as="h1">Ressources</Title>
                        </Col>
                    </Row>
                </Container>
            </div>
            <Container spacing="pt-2w">
                <Row className="fr-pt-2w fr-pb-5w">
                    <Link href="https://zlv.notion.site/Centre-de-ressources-543b515794324b16bd00d261a118db06" target="_blank">
                        Centre de ressources
                    </Link>
                </Row>
                <hr />
                <Title as="h2" look="h5">
                    Arborescence de mise à jour des dossiers
                </Title>
                <Alert title=""
                       description="Afin de vous aider dans la mise à jour des dossiers, vous trouverez ci-dessous l'ensemble des statuts que vous pouvez appliquer aux dossiers dans la solution ZLV. En face des statuts, vous trouverez les sous-statuts et précisions correspondantes."
                       type="info"
                       className="fr-mb-3w"/>
                <Row className="fr-py-1w bordered-b bg-100">
                    <Col n="4"><b>Statuts</b></Col>
                    <Col n="4"><b>Sous statuts</b></Col>
                    <Col n="4"><b>Précisions</b></Col>
                </Row>
                { housingStatesSorted.map((state, stateIndex) =>
                    <Row className={classNames('fr-py-1w', {'bordered-b': stateIndex !== housingStatesSorted.length - 1})} key={state + "_" + stateIndex}>
                        <Col n="4">
                            <b>{state.title}</b>
                        </Col>
                        <Col>
                            {state.subStatusList?.map((subStatus, subStatusIndex) =>
                                <Row className={classNames('fr-py-1w', {'bordered-b': subStatusIndex + 1 !== state.subStatusList?.length})} key={state + "_" + subStatus + "_" + subStatusIndex}>
                                    <Col>
                                        {subStatus.title}
                                    </Col>
                                    <Col>
                                        {subStatus.precisions?.map((_, precisionIndex) =>
                                            <Row key={state + "_" + subStatus + "_" + precisionIndex}>
                                                <Col>
                                                    {_.title}
                                                </Col>
                                            </Row>
                                        )}
                                    </Col>
                                </Row>
                            )}
                        </Col>
                    </Row>
                )}
            </Container>
        </>
    );
};

export default ResourcesView;

