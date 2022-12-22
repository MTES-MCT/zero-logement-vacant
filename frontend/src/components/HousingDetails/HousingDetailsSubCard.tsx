import { Card, CardDescription, CardTitle, Title } from '@dataesr/react-dsfr';
import React, { ReactElement } from 'react';
import styles from './housing-details-card.module.scss';
import classNames from 'classnames';
import ButtonLink from '../ButtonLink/ButtonLink';

interface Props {
  title: string;
  onModify?: () => any;
  children?: ReactElement | ReactElement[];
}

function HousingDetailsSubCard({ title, onModify, children }: Props) {
  return (
    <Card
      hasArrow={false}
      hasBorder={false}
      size="sm"
      className={classNames(styles.subCard, 'app-card-xs')}
    >
      <CardTitle>
        <Title
          as="h2"
          look="h6"
          spacing="mb-1w"
          className={classNames(styles.title, styles.titleInline)}
        >
          {title}
          {onModify && (
            <ButtonLink
              className={styles.link}
              display="flex"
              icon="ri-edit-2-fill"
              iconPosition="left"
              iconSize="1x"
              isSimple
              title="Modifier"
              onClick={() => onModify()}
            >
              Modifier
            </ButtonLink>
          )}
        </Title>
        <hr />
      </CardTitle>
      <CardDescription className={styles.content}>{children}</CardDescription>
    </Card>
  );
}

export default HousingDetailsSubCard;
