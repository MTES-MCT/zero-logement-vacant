import React, { useState } from 'react';
import GeoPerimetersModal from './GeoPerimetersModal';
import AppLink from '../../AppLink/AppLink';

const GeoPerimetersModalLink = () => {
  const [isGeoPerimetersModalOpen, setIsGeoPerimetersModalOpen] =
    useState<boolean>(false);

  return (
    <>
      <AppLink
        to="#"
        onClick={() => {
          setIsGeoPerimetersModalOpen(true);
        }}
        isSimple
        iconId="fr-icon-settings-5-fill"
        iconPosition="left"
      >
        Gérer vos périmètres
      </AppLink>
      {isGeoPerimetersModalOpen && (
        <GeoPerimetersModal
          onClose={() => setIsGeoPerimetersModalOpen(false)}
        />
      )}
    </>
  );
};

export default GeoPerimetersModalLink;
