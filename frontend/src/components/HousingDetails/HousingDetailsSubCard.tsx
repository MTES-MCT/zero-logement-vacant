import { fr } from '@codegouvfr/react-dsfr';
import Grid from '@mui/material/Unstable_Grid2';
import Typography from '@mui/material/Typography';
import classNames from 'classnames';
import { ReactElement, ReactNode } from 'react';

import styles from './housing-details-card.module.scss';

interface Props {
  title: ReactNode;
  className?: string;
  isGrey?: boolean;
  hasBorder?: boolean;
  children?: ReactElement | (ReactElement | undefined)[];
}

function HousingDetailsSubCard(props: Props) {
  return (
    <article
      className={classNames(styles.card, props.className, {
        [styles.fill]: props.isGrey
      })}
    >
      <Grid component="header" container sx={{ mb: 1 }} xs>
        {typeof props.title === 'string' ? (
          <Typography className={styles.title} component="h2" variant="h6">
            {props.title}
          </Typography>
        ) : (
          props.title
        )}
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
