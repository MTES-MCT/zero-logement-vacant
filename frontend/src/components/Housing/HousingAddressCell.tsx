import { Fragment } from 'react';

import AppLink from '~/components/_app/AppLink/AppLink';

interface HousingAddressCellProps {
  id: string;
  rawAddress: string[];
}

function HousingAddressCell({
  id,
  rawAddress
}: Readonly<HousingAddressCellProps>) {
  return (
    <AppLink isSimple size="sm" to={`/logements/${id}`}>
      {rawAddress.map((line, i) => (
        <Fragment key={i}>
          {line}
          <br />
        </Fragment>
      ))}
    </AppLink>
  );
}

export default HousingAddressCell;
