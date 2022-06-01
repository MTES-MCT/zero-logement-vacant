import React, { useRef, useState } from 'react';
import {
    Alert,
    Button,
    Col,
    Container,
    Modal,
    ModalClose,
    ModalContent,
    ModalFooter,
    ModalTitle,
    Row,
    Select,
} from '@dataesr/react-dsfr';
import { HousingOwner } from '../../../models/Owner';

import * as yup from 'yup';
import { ValidationError } from 'yup/es';
import { SelectOption } from '../../../models/SelectOption';
import AppSearchBar, { SearchResult } from '../../AppSearchBar/AppSearchBar';
import ownerService from '../../../services/owner.service';
import { format } from 'date-fns';
import styles from './housing-owner-modal.module.scss';

const HousingOwnersModal = ({housingId, housingOwners, onClose, onSubmit}: {housingId: string, housingOwners: HousingOwner[], onSubmit: (owners: HousingOwner[]) => void, onClose: () => void}) => {

    const [ownerKinds, setOwnerKinds] = useState<{ownerId: string, kind: string}[]>(housingOwners.map(_ => ({ownerId: _.id, kind: String(_.endDate ? 0 : _.rank)})));
    const [additionalOwners, setAdditionalOwners] = useState<HousingOwner[]>([]);
    const [errors, setErrors] = useState<any>({});
    const [expandNewOwner, setExpandNewOwner] = useState<boolean>(false);
    const quickSearchAbortRef = useRef<() => void | null>();

    const ownersForm = yup.object().shape({
        ownerKinds1: yup.array().compact(ownerKind => ownerKind.kind !== String(1))
            .min(1, 'Il doit y avoir au moins un propriétaire principal')
            .max(1, 'Il ne peut y avoir qu\'un propriétaire principal'),
        // ownerKinds2: yup.array().compact(ownerKind => ownerKind.kind !== String(2))
        //     .max(1, 'Il ne peut y avoir qu\'un 2ème ayant-droit')
    });

    const selectKind = (ownerId: string, kind: string) => {
        setOwnerKinds(ownerKinds.map(_ => _.ownerId === ownerId ? { ownerId, kind} : _))
    }

    const ownerKindOptions: SelectOption[] = [
        {value: '1', label: `Propriétaire principal`},
        ...Array.from(Array([...housingOwners, ...additionalOwners].length - 1).keys()).map(_ => (
                {value: String(_ + 2), label: (_ + 2) + 'ème ayant droit'}
            )),
        {value: '0', label: `Ancien propriétaire`}
    ]

    const submit = () => {

        ownersForm
            .validate({ ownerKinds1: ownerKinds, ownerKinds2: ownerKinds }, {abortEarly: false})
            .then(() => {
                onSubmit([...housingOwners, ...additionalOwners].map(ho => {
                    const ownerKind = ownerKinds.find(_ => _.ownerId === ho.id)
                    return {
                        ...ho,
                        rank: Number(ownerKind?.kind) ?? ho.rank,
                        endDate: ownerKind?.kind === String('0') ? ho.endDate ?? (new Date()): undefined
                    }
                }));
            })
            .catch(err => {
                const object: any = {};
                err.inner.forEach((x: ValidationError) => {
                    if (x.path !== undefined && x.errors.length) {
                        object[x.path] = x.errors[0];
                    }
                });
                setErrors(object);
            })
    }

    const quickSearch = (query: string) => {
        if (quickSearchAbortRef.current) {
            quickSearchAbortRef.current()
        }
        const quickSearchService = ownerService.quickSearchService()
        quickSearchAbortRef.current = quickSearchService.abort;

        if (query.length) {
            return quickSearchService.fetch(query)
                .then(_ => _.map(
                    owner => ({
                        title: [
                            owner.fullName,
                            owner.birthDate ? format(owner.birthDate, 'dd/MM/yyyy') : undefined,
                            owner.rawAddress.join(' - ')
                        ].filter(_ => _?.length).join(' - '),
                        onclick: () => {
                            setAdditionalOwners([...additionalOwners, {...owner, housingId, rank: 1}])
                            setOwnerKinds([...ownerKinds, {ownerId: owner.id, kind: '1'}])
                            setExpandNewOwner(false)
                        }
                    } as SearchResult)
                ))
                .catch(err => console.log('error', err))
        } else {
            return Promise.resolve([])
        }
    }

    return (
        <Modal isOpen={true}
               hide={() => onClose()}>
            <ModalClose hide={() => onClose()} title="Fermer la fenêtre">Fermer</ModalClose>
            <ModalTitle>Modifier les propriétaires</ModalTitle>
            <ModalContent>
                <Row className="fr-pb-2w">
                    <Col>
                        <button
                            className="ds-fr--inline fr-link fr-pl-0"
                            type="button"
                            title={expandNewOwner ? 'Annuler' : 'Ajouter un propriétaire'}
                            aria-controls="additional-filters"
                            aria-expanded={expandNewOwner}
                            onClick={() => setExpandNewOwner(!expandNewOwner)}
                            data-testid="additional-filters-button"
                        >
                            {expandNewOwner ?
                                <><span className="ri-1x icon-left ri-subtract-line ds-fr--v-middle"/>Ajouter un propriétaire</> :
                                <><span className="ri-1x icon-left ri-add-line ds-fr--v-middle"/>Ajouter un propriétaire</>
                            }
                        </button>
                        {expandNewOwner &&
                            <>
                                <AppSearchBar onSearch={quickSearch}
                                              onKeySearch={quickSearch}
                                              maxResults={10}/>
                            </>
                        }
                    </Col>
                </Row>
                {[...housingOwners, ...additionalOwners].map(owner => (
                    <Row key={owner.id} spacing="pb-1w" className={expandNewOwner ? styles.disabled : ''}>
                        <Col>
                            {owner.fullName}
                        </Col>
                        <Col>
                            <Select
                                options={ownerKindOptions}
                                selected={String(ownerKinds.find(_ => _.ownerId === owner.id)?.kind)}
                                onChange={(e: any) => selectKind(owner.id, e.target.value)}/>
                            {/*messageType={formErrors['status'] ? 'error' : undefined}*/}
                            {/*message={formErrors['status']}*/}
                        </Col>
                  </Row>

                ))}
            </ModalContent>
            <ModalFooter>
                <Container>
                    {Object.values(errors).length > 0 &&
                        <Row className="fr-pb-2w">
                            <Col>
                                <Alert title="Erreur" description={Object.values(errors)[0]} type="error"/>
                            </Col>
                        </Row>
                    }
                    <Row>
                        <Col>
                            <Button title="Annuler"
                                    secondary
                                    className="fr-mr-2w"
                                    onClick={() => onClose()}>
                                Annuler
                            </Button>
                            <Button title="Enregistrer"
                                    onClick={() => submit()}
                                    data-testid="create-button">
                                Enregistrer
                            </Button>
                        </Col>
                    </Row>
                </Container>
            </ModalFooter>
        </Modal>
    );
};

export default HousingOwnersModal;

