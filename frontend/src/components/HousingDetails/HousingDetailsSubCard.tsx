import Card from '@codegouvfr/react-dsfr/Card';
import Typography from '@mui/material/Typography';

import { ReactElement } from 'react';
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
      border={!!hasBorder}
      size="small"
      className={classNames(styles.subCard, 'app-card-xs', {
        'bg-975': isGrey
      })}
      title={
        <>
          {typeof title === 'string' ? (
            <Typography
              component="h2"
              variant="h6"
              mb={1}
              className={classNames(styles.title, styles.titleInline)}
            >
              {title}
            </Typography>
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
