import ToggleSwitch from '@codegouvfr/react-dsfr/ToggleSwitch';

import createPerimetersModal from '~/components/modals/GeoPerimetersModal/PerimetersModal';
import PerimetersModalOpener from '~/components/modals/GeoPerimetersModal/PerimetersModalOpener';
import { useUser } from '~/hooks/useUser';

import styles from './map-controls.module.scss';

const perimetersModal = createPerimetersModal();

interface Props {
  clusterize: boolean;
  perimeters: boolean;
  /**
   * @default true
   */
  show?: boolean;
  onClusterizeChange(checked: boolean): void;
  onPerimetersChange(checked: boolean): void;
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
        label="Afficher tous vos périmètres"
        onChange={props.onPerimetersChange}
      />

      <perimetersModal.Component />
      {!isVisitor && (
        <PerimetersModalOpener className="fr-my-1w" modal={perimetersModal} />
      )}

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
