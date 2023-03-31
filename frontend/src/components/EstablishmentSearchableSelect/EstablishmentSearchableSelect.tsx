import React, { useEffect, useState } from 'react';
import { SearchableSelect } from '@dataesr/react-dsfr';
import establishmentService from '../../services/establishment.service';
import { useEstablishments } from '../../hooks/useEstablishments';

interface Props {
  onChange(establishmentId: string): void;
  initialEstablishmentId?: string;
}

const EstablishmentSearchableSelect = ({
  onChange,
  initialEstablishmentId,
}: Props) => {
  const { availableEstablishmentOptions } = useEstablishments();
  const [establishmentOptions, setEstablishmentOptions] = useState<
    { value: string; label: string }[]
  >([]);

  useEffect(() => {
    setEstablishmentOptions(availableEstablishmentOptions);
  }, [availableEstablishmentOptions]);

  const quickSearch = (query: string) => {
    if (query.length) {
      establishmentService
        .quickSearch(query)
        .then((_) =>
          setEstablishmentOptions(
            _.map((establishment) => ({
              value: establishment.id,
              label: establishment.name,
            }))
          )
        )
        .catch((err) => console.log('error', err));
    } else {
      setEstablishmentOptions(availableEstablishmentOptions);
    }
  };

  return (
    <SearchableSelect
      selected={initialEstablishmentId}
      options={establishmentOptions}
      label="Etablissement : "
      onChange={onChange}
      placeholder="Rechercher un établissement"
      required={true}
      onTextChange={(q: string) => quickSearch(q)}
    />
  );
};

export default EstablishmentSearchableSelect;
