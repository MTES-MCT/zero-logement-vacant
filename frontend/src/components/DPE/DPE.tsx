import classNames from 'classnames';

import styles from './dpe.module.scss';

interface Props {
  /**
   * The Diagnosis of Performance
   */
  value: string;
}

function DPE(props: Props) {
  const value = props.value.toUpperCase();
  return <div className={classNames(styles.dpe, styles[value])}>{value}</div>;
}

export default DPE;
