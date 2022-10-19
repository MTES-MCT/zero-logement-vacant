import React from 'react';

import { Col, Container, Link, Row, Title } from '@dataesr/react-dsfr';
import AppBreadcrumb from '../../components/AppBreadcrumb/AppBreadcrumb';
import { HousingStates } from '../../models/HousingState';
import classNames from 'classnames';

const ResourcesView = () => {

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
                    <Link href="https://zlv.notion.site/Backend-Centre-de-ressources-collectivit-s-fe07bd501de24094b3b7ec1128c61605" target="_blank">
                        Centre de ressources
                    </Link>
                </Row>
                <Row className="fr-py-1w bordered-b bg-100">
                    <Col n="4"><b>Statuts</b></Col>
                    <Col n="4"><b>Sous statuts</b></Col>
                    <Col n="4"><b>Précisions</b></Col>
                </Row>
                { HousingStates.map((state, stateIndex) =>
                    <Row className={classNames('fr-py-1w', {'bordered-b': stateIndex !== HousingStates.length - 1})} key={state + "_" + stateIndex}>
                        <Col n="4">
                            {state.title}
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

