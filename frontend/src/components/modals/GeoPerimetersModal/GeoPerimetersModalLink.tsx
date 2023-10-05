import React, { useState } from 'react';
import GeoPerimetersModal from './GeoPerimetersModal';
import AppLinkAsButton from '../../AppLinkAsButton/AppLinkAsButton';

const GeoPerimetersModalLink = () => {
  const [isGeoPerimetersModalOpen, setIsGeoPerimetersModalOpen] =
    useState<boolean>(false);

  return (
    <>
      <AppLinkAsButton
        onClick={() => {
          setIsGeoPerimetersModalOpen(true);
        }}
        isSimple
        iconId="fr-icon-settings-5-fill"
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
