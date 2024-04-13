import styles from './map-controls.module.scss';
import ToggleSwitch from '@codegouvfr/react-dsfr/ToggleSwitch';

interface Props {
  clusterize: boolean;
  perimeters: boolean;
  onClusterizeChange: (checked: boolean) => void;
  onPerimetersChange: (checked: boolean) => void;
}

function MapControls(props: Props) {
  return (
    <section className={styles.controls}>
      <ToggleSwitch
        checked={props.perimeters}
        label="Afficher vos périmètres déposés"
        onChange={props.onPerimetersChange}
      />
      <ToggleSwitch
        checked={props.clusterize}
        label="Grouper les bâtiments"
        onChange={props.onClusterizeChange}
      />
    </section>
  );
}

export default MapControls;
