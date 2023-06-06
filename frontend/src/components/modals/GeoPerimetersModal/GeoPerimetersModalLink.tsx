import React, { useState } from 'react';
import { Link } from '@dataesr/react-dsfr';
import GeoPerimetersModal from './GeoPerimetersModal';

const GeoPerimetersModalLink = () => {
  const [isGeoPerimetersModalOpen, setIsGeoPerimetersModalOpen] =
    useState<boolean>(false);

  return (
    <>
      <Link
        href="#"
        onClick={() => {
          setIsGeoPerimetersModalOpen(true);
        }}
        className="fr-link"
        icon="ri-settings-4-fill"
        iconPosition="left"
      >
        Gérer vos périmètres
      </Link>
      {isGeoPerimetersModalOpen && (
        <GeoPerimetersModal
          onClose={() => setIsGeoPerimetersModalOpen(false)}
        />
      )}
    </>
  );
};

export default GeoPerimetersModalLink;
