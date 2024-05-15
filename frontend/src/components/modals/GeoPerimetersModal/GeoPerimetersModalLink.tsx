import { useState } from 'react';
import GeoPerimetersModal from './GeoPerimetersModal';
import AppLinkAsButton from '../../_app/AppLinkAsButton/AppLinkAsButton';

const GeoPerimetersModalLink = () => {
  const [isGeoPerimetersModalOpen, setIsGeoPerimetersModalOpen] =
    useState<boolean>(false);

  return (
    <>
      <AppLinkAsButton
        onClick={() => {
          setIsGeoPerimetersModalOpen(true);
        }}
        className="fr-btn fr-btn--tertiary fr-btn--sm fr-btn--icon-left fr-mb-1w"
        iconId="fr-icon-france-line"
      >
        Gérer vos périmètres
      </AppLinkAsButton>
      {isGeoPerimetersModalOpen && (
        <GeoPerimetersModal
          onClose={() => setIsGeoPerimetersModalOpen(false)}
        />
      )}
    </>
  );
};

export default GeoPerimetersModalLink;
