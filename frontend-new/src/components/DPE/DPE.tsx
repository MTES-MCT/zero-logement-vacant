import classNames from 'classnames';

import styles from './dpe.module.scss';
import { format } from 'date-fns';
import { isDefined } from '../../utils/compareUtils';
import { Fragment, ReactElement } from 'react';
import AppLink from '../_app/AppLink/AppLink';

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
      <AppLink
        target="_blank"
        to={`https://particulier.gorenove.fr/map?bnb_id=${props.bnbId}`}
      >
        Voir Go Rénove
      </AppLink>
    ) : undefined,
  ].filter(isDefined);

  return <>
    <div className={classNames(styles.dpe, styles[value])}>{value}</div>
    {additionalInfos.length > 0 && (
      <>
         (
        {additionalInfos.map((elt, index) => (
          <Fragment key={index}>
            {!!index && <> - </>}
            {elt}
          </Fragment>
        ))}
        )
      </>
    )}
  </>;
}

export default DPE;
