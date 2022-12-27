import React, { useState } from 'react';
import {
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
import Alert from '../../Alert/Alert';

const HousingOwnersModal = ({
  housingOwners,
  onClose,
  onSubmit,
}: {
  housingOwners: HousingOwner[];
  onSubmit: (owners: HousingOwner[]) => void;
  onClose: () => void;
}) => {
  const [ownerRanks, setOwnerRanks] = useState<
    { ownerId: string; rank: string }[]
  >(
    housingOwners.map((_) => ({
      ownerId: _.id,
      rank: String(_.endDate ? 0 : _.rank),
    }))
  );
  const [errors, setErrors] = useState<any>({});

  const ownersForm = yup.object().shape(
    Array.from(Array(housingOwners.length - 1).keys()).reduce(
      (o, ho, ownerIndex) => ({
        ...o,
        [`ownerRanks${ownerIndex + 2}`]: yup
          .array()
          .compact((ownerRank) => ownerRank.rank !== String(ownerIndex + 2))
          .max(1, `Il ne peut y avoir qu'un ${ownerIndex + 2}ème ayant-droit`),
      }),
      {
        ownerRanks1: yup
          .array()
          .compact((ownerRank) => ownerRank.rank !== String(1))
          .min(1, 'Il doit y avoir au moins un propriétaire principal')
          .max(1, "Il ne peut y avoir qu'un propriétaire principal"),
      }
    )
  );

  const selectRank = (ownerId: string, rank: string) => {
    setOwnerRanks(
      ownerRanks.map((_) => (_.ownerId === ownerId ? { ownerId, rank } : _))
    );
  };

  const ownerRankOptions: SelectOption[] = [
    { value: '1', label: `Propriétaire principal` },
    ...Array.from(Array(housingOwners.length - 1).keys()).map((_) => ({
      value: String(_ + 2),
      label: _ + 2 + 'ème ayant droit',
    })),
    { value: '0', label: `Ancien propriétaire` },
  ];

  const submit = () => {
    ownersForm
      .validate(
        Array.from(Array(housingOwners.length - 1).keys()).reduce(
          (o, ho, ownerIndex) => ({
            ...o,
            [`ownerRanks${ownerIndex + 2}`]: ownerRanks,
          }),
          { ownerRanks1: ownerRanks }
        ),
        { abortEarly: false }
      )
      .then(() => {
        onSubmit(
          housingOwners.map((ho) => {
            const ownerRank = ownerRanks.find((_) => _.ownerId === ho.id);
            return {
              ...ho,
              rank: Number(ownerRank?.rank) ?? ho.rank,
              endDate:
                ownerRank?.rank === String('0')
                  ? ho.endDate ?? new Date()
                  : undefined,
            };
          })
        );
      })
      .catch((err) => {
        const object: any = {};
        err.inner.forEach((x: ValidationError) => {
          if (x.path !== undefined && x.errors.length) {
            object[x.path] = x.errors[0];
          }
        });
        setErrors(object);
      });
  };

  return (
    <Modal isOpen={true} hide={() => onClose()}>
      <ModalClose hide={() => onClose()} title="Fermer la fenêtre">
        Fermer
      </ModalClose>
      <ModalTitle>Modifier les propriétaires</ModalTitle>
      <ModalContent>
        {housingOwners.map((owner) => (
          <Row key={owner.id} spacing="pb-1w">
            <Col>{owner.fullName}</Col>
            <Col>
              <Select
                options={ownerRankOptions}
                selected={String(
                  ownerRanks.find((_) => _.ownerId === owner.id)?.rank
                )}
                onChange={(e: any) => selectRank(owner.id, e.target.value)}
              />
            </Col>
          </Row>
        ))}
      </ModalContent>
      <ModalFooter>
        <Container>
          {Object.values(errors).length > 0 && (
            <Row className="fr-pb-2w">
              <Col>
                <Alert
                  title="Erreur"
                  description={Object.values(errors)[0] as string}
                  type="error"
                />
              </Col>
            </Row>
          )}
          <Row>
            <Col>
              <Button
                title="Annuler"
                secondary
                className="fr-mr-2w"
                onClick={() => onClose()}
              >
                Annuler
              </Button>
              <Button
                title="Enregistrer"
                onClick={() => submit()}
                data-testid="create-button"
              >
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
