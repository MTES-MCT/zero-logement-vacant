import React, { useEffect, useRef, useState } from 'react';
import { SearchableSelect } from '@dataesr/react-dsfr';
import establishmentService from '../../services/establishment.service';
import { useAvailableEstablishmentOptions } from '../../hooks/useAvailableEstablishmentOptions';

interface Props {
    onChange(establishmentId: string): void
}

const EstablishmentSearchableSelect = ({ onChange }: Props) => {

    const availableEstablishmentOptions = useAvailableEstablishmentOptions();
    const [establishmentOptions, setEstablishmentOptions] = useState<{value: string, label: string}[]>([]);
    const quickSearchAbortRef = useRef<() => void | null>();

    useEffect(() => {
        setEstablishmentOptions(availableEstablishmentOptions);
    }, [availableEstablishmentOptions])

    const quickSearch = (query: string) => {

        quickSearchAbortRef.current?.();

        const quickSearchService = establishmentService.quickSearchService();
        quickSearchAbortRef.current = quickSearchService.abort;

        if (query.length) {
             quickSearchService.fetch(query)
                .then(_ => setEstablishmentOptions(_.map(
                    establishment => ({
                        value: establishment.id,
                        label: establishment.name
                    }))
                ))
                .catch(err => console.log('error', err))
        } else {
            setEstablishmentOptions(availableEstablishmentOptions)
        }
    }

    return (
        <SearchableSelect
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

