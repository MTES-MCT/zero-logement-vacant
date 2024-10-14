import { fr } from '@codegouvfr/react-dsfr';
import Grid from '@mui/material/Unstable_Grid2';
import { ReactElement, ReactNode } from 'react';

import styles from './housing-details-card.module.scss';
import classNames from 'classnames';

interface Props {
  title: ReactNode;
  className?: string;
  isGrey?: boolean;
  hasBorder?: boolean;
  children?: ReactElement | (ReactElement | undefined)[];
}

function HousingDetailsSubCard(props: Props) {
  return (
    <article className={classNames(styles.card, props.className)}>
      <Grid component="header" container xs>
        {props.title}
      </Grid>
      <hr className={fr.cx('fr-py-1w')} />
      {props.children ? (
        <Grid component="section" container xs>
          {props.children}
        </Grid>
      ) : null}
    </article>
  );
}

export default HousingDetailsSubCard;
