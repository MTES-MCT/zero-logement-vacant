import React, { ChangeEvent, useState } from 'react';
import {
  Button,
  Checkbox,
  Col,
  Container,
  Modal,
  ModalClose,
  ModalContent,
  ModalFooter,
  ModalTitle,
  Row,
  Tag,
  TextInput,
} from '@dataesr/react-dsfr';

import * as yup from 'yup';
import { useForm } from '../../../hooks/useForm';
import { Locality, TaxKinds, TaxKindsLabels } from '../../../models/Locality';
import Help from '../../Help/Help';

interface Props {
  locality: Locality;
  onSubmit: (xKind: TaxKinds, taxRate?: number) => void;
  onClose: () => void;
}

const LocalityTaxEditionModal = ({ locality, onSubmit, onClose }: Props) => {
  const [hasTHLV, setHasTHLV] = useState(locality.taxKind === TaxKinds.THLV);
  const [taxRate, setTaxRate] = useState(String(locality.taxRate ?? ''));

  const schema = yup.object().shape(
    hasTHLV
      ? {
          taxRate: yup.number().typeError('Veuillez saisir un taux valide'),
        }
      : {}
  );

  const { isValid, message, messageType } = useForm(
    schema,
    {
      taxRate,
    },
    { dependencies: [hasTHLV] }
  );

  const submitContactPointForm = () => {
    if (isValid()) {
      if (hasTHLV && taxRate) {
        onSubmit(TaxKinds.THLV, Number(taxRate));
      } else {
        onSubmit(TaxKinds.None);
      }
    }
  };

  return (
    <Modal isOpen={true} hide={() => onClose()}>
      <ModalClose hide={() => onClose()} title="Fermer la fenêtre">
        Fermer
      </ModalClose>
      <ModalTitle>
        <span className="ri-1x icon-left ri-arrow-right-line ds-fr--v-middle" />
        Taxe à {locality.name}
      </ModalTitle>
      <ModalContent>
        <Container as="section" fluid>
          <Tag>{TaxKindsLabels[hasTHLV ? TaxKinds.THLV : TaxKinds.None]}</Tag>
          <form id="user_form">
            <Row spacing="my-2w">
              <Col>
                <Checkbox
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setHasTHLV(e.target.checked)
                  }
                  checked={hasTHLV}
                  label="Cette commune est soumise à la THLV (Taxe d'habitation sur les logements vacants)"
                />
              </Col>
            </Row>
            {hasTHLV ? (
              <Row spacing="my-2w">
                <Col>
                  <TextInput
                    value={taxRate}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setTaxRate(e.target.value)
                    }
                    messageType={messageType('taxRate')}
                    message={message('taxRate')}
                    label="Taux après 2 ans"
                  />
                </Col>
              </Row>
            ) : (
              <Help>
                La taxe d’habitation sur les logements vacants (THLV) peut être
                instaurée dans toutes les communes où la TLV n’est pas
                appliquée.
              </Help>
            )}
          </form>
        </Container>
      </ModalContent>
      <ModalFooter>
        <Button
          title="Annuler"
          secondary
          className="fr-mr-2w"
          onClick={() => onClose()}
        >
          Annuler
        </Button>
        <Button title="Enregistrer" onClick={() => submitContactPointForm()}>
          Enregistrer
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default LocalityTaxEditionModal;
