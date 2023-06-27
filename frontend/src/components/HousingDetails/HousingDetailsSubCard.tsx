import { Card, CardDescription, CardTitle, Title } from '@dataesr/react-dsfr';
import React, { ReactElement } from 'react';
import styles from './housing-details-card.module.scss';
import classNames from 'classnames';

interface Props {
  title: string | ReactElement;
  isGrey?: boolean;
  hasBorder?: boolean;
  children?: ReactElement | (ReactElement | undefined)[];
}

function HousingDetailsSubCard({ title, isGrey, hasBorder, children }: Props) {
  return (
    <Card
      hasArrow={false}
      hasBorder={!!hasBorder}
      size="sm"
      className={classNames(styles.subCard, 'app-card-xs', {
        'bg-975': isGrey,
      })}
    >
      <CardTitle>
        <Title
          as="h2"
          look="h6"
          spacing="mb-1w"
          className={classNames(styles.title, styles.titleInline)}
        >
          {title}
        </Title>
        <hr className="fr-py-1w" />
      </CardTitle>
      <CardDescription className={styles.content}>{children}</CardDescription>
    </Card>
  );
}

export default HousingDetailsSubCard;
