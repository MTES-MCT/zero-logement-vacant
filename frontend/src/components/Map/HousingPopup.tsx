import { Popup, PopupProps } from 'react-map-gl';
import { HousingWithCoordinates, toLink } from '../../models/Housing';
import { Link } from '@dataesr/react-dsfr';

interface HousingPopupProps {
  housing: HousingWithCoordinates;
  onClose: PopupProps['onClose'];
}

function HousingPopup(props: HousingPopupProps) {
  return (
    <Popup
      anchor="bottom"
      longitude={props.housing.longitude}
      latitude={props.housing.latitude}
      offset={32}
      onClose={props.onClose}
    >
      <Link isSimple href={toLink(props.housing)} target="_blank">
        {props.housing.rawAddress.map((address) => (
          <>
            {address}
            <br />
          </>
        ))}
      </Link>
    </Popup>
  );
}

export default HousingPopup;
