import React from 'react';
import classNames from 'classnames';
import Card from '@codegouvfr/react-dsfr/Card';
import {
  FrIconClassName,
  RiIconClassName,
} from '@codegouvfr/react-dsfr/src/fr/generatedFromCss/classNames';

interface Props {
  children: any;
  iconId: FrIconClassName | RiIconClassName;
  grey?: boolean;
}

function CampaignInfoCard({ children, iconId, grey = false }: Props) {
  return (
    <Card
      title=""
      border={false}
      grey={grey}
      className={classNames('app-card-xs', { 'bg-bf925': !grey })}
      classes={{ end: 'd-none' }}
      desc={
        <>
          <div
            className={classNames(
              iconId,
              'card-icon',
              grey ? 'color-grey-850' : 'color-bf925-active'
            )}
            aria-hidden="true"
          />
          {children}
        </>
      }
    ></Card>
  );
}

export default CampaignInfoCard;
