import classNames from 'classnames';
import { format } from 'date-fns';
import type { ReactElement } from 'react';
import React from 'react';

import { Predicate } from 'effect';
import styles from './dpe.module.scss';

interface Props {
  /**
   * The Diagnosis of Performance
   */
  value: string;
  madeAt?: Date | null;
}

function DPE(props: Props) {
  const value = props.value.toUpperCase();

  const additionalInfos: ReactElement[] = [
    props.madeAt ? <>{format(props.madeAt, 'dd/MM/yyyy')}</> : undefined
  ].filter(Predicate.isNotUndefined);

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
