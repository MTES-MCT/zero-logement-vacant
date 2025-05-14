import ToggleSwitch from '@codegouvfr/react-dsfr/ToggleSwitch';
import { useUser } from '../../hooks/useUser';
import GeoPerimetersModalLink from '../modals/GeoPerimetersModal/GeoPerimetersModalLink';
import styles from './map-controls.module.scss';

interface Props {
  clusterize: boolean;
  perimeters: boolean;
  /**
   * @default true
   */
  show?: boolean;
  onClusterizeChange: (checked: boolean) => void;
  onPerimetersChange: (checked: boolean) => void;
}

function MapControls(props: Props) {
  const { isVisitor } = useUser();
  const show = props.show ?? true;

  if (!show) {
    return null;
  }

  return (
    <section className={styles.controls}>
      <ToggleSwitch
        checked={props.perimeters}
        label="Afficher vos périmètres déposés"
        onChange={props.onPerimetersChange}
      />

      {!isVisitor && <GeoPerimetersModalLink />}

      <hr />

      <ToggleSwitch
        checked={props.clusterize}
        label="Grouper les bâtiments"
        onChange={props.onClusterizeChange}
      />
    </section>
  );
}

export default MapControls;
