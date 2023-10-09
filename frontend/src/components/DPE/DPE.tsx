import classNames from 'classnames';

import styles from './dpe.module.scss';
import { format } from 'date-fns';
import { isDefined } from '../../utils/compareUtils';
import React, { ReactElement } from 'react';
import { Link } from '@dataesr/react-dsfr';

interface Props {
  /**
   * The Diagnosis of Performance
   */
  value: string;
  madeAt?: Date;
  bnbId?: string;
}

function DPE(props: Props) {
  const value = props.value.toUpperCase();

  const additionalInfos: ReactElement[] = [
    props.madeAt ? <>{format(props.madeAt, 'dd/MM/yyyy')}</> : undefined,
    props.bnbId ? (
      <Link
        target="_blank"
        href={`https://particulier.gorenove.fr/map?bnb_id=${props.bnbId}`}
      >
        Voir Go Rénove
      </Link>
    ) : undefined,
  ].filter(isDefined);

  return (
    <>
      <div className={classNames(styles.dpe, styles[value])}>{value}</div>
      {additionalInfos.length > 0 && (
        <>
           (
          {additionalInfos.map((elt, index) => (
            <React.Fragment key={index}>
              {!!index && <> - </>}
              {elt}
            </React.Fragment>
          ))}
          )
        </>
      )}
    </>
  );
}

export default DPE;
