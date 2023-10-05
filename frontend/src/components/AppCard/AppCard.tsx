import React from 'react';
import classNames from 'classnames';
import Card from '@codegouvfr/react-dsfr/Card';

interface Props {
  children: any;
  icon: string;
  grey?: boolean;
}

function AppCard({ children, icon, grey = false }: Props) {
  return (
    <Card
      title=""
      border={false}
      grey={grey}
      className={classNames('app-card-xs', { 'bg-bf925': !grey })}
      desc={
        <>
          <div
            className={classNames(
              icon,
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

export default AppCard;
