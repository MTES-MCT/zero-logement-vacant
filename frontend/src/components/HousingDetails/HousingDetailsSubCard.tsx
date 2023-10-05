import { Title } from '../_dsfr/index';
import React, { ReactElement } from 'react';
import styles from './housing-details-card.module.scss';
import classNames from 'classnames';
import Card from '@codegouvfr/react-dsfr/Card';

interface Props {
  title: string | ReactElement;
  isGrey?: boolean;
  hasBorder?: boolean;
  children?: ReactElement | (ReactElement | undefined)[];
}

function HousingDetailsSubCard({ title, isGrey, hasBorder, children }: Props) {
  return (
    <Card
      border={!!hasBorder}
      size="small"
      className={classNames(styles.subCard, 'app-card-xs', {
        'bg-975': isGrey,
      })}
      title={
        <>
          {typeof title === 'string' ? (
            <Title
              as="h2"
              look="h6"
              spacing="mb-1w"
              className={classNames(styles.title, styles.titleInline)}
            >
              {title}
            </Title>
          ) : (
            title
          )}
          <hr className="fr-py-1w" />
        </>
      }
      desc={<div className={styles.content}>{children}</div>}
    ></Card>
  );
}

export default HousingDetailsSubCard;
