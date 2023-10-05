import React from 'react';

import { Col, Row } from '../../components/dsfr/index';
import { Alert } from '@codegouvfr/react-dsfr/Alert';
import { HousingStates } from '../../models/HousingState';
import classNames from 'classnames';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import MainContainer from '../../components/MainContainer/MainContainer';

const StatusView = () => {
  useDocumentTitle('Arborescence des statuts');

  return (
    <MainContainer title="Arborescence des statuts">
      <Alert
        description="Afin de vous aider dans la mise à jour des dossiers, vous trouverez ci-dessous l'ensemble des statuts de suivi que vous pouvez appliquer aux dossiers dans la solution ZLV. En face des statuts, vous trouverez les sous-statuts correspondants."
        severity="info"
        small
        className="fr-mb-3w"
      />
      <Row className="fr-py-1w bordered-b bg-100">
        <Col n="4">
          <b>Statuts</b>
        </Col>
        <Col n="4">
          <b>Sous statuts</b>
        </Col>
      </Row>
      {HousingStates.map((state, stateIndex) => (
        <Row
          className={classNames('fr-py-1w', {
            'bordered-b': stateIndex !== HousingStates.length - 1,
          })}
          key={state + '_' + stateIndex}
        >
          <Col n="4">
            <b>{state.title}</b>
          </Col>
          <Col>
            {state.subStatusList?.map((subStatus, subStatusIndex) => (
              <Row
                className={classNames('fr-py-1w', {
                  'bordered-b':
                    subStatusIndex + 1 !== state.subStatusList?.length,
                })}
                key={state + '_' + subStatus + '_' + subStatusIndex}
              >
                <Col>{subStatus.title}</Col>
              </Row>
            ))}
          </Col>
        </Row>
      ))}
    </MainContainer>
  );
};

export default StatusView;
