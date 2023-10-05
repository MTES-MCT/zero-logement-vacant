import React, { ChangeEvent, useMemo, useState } from 'react';
import { Col, Container, Row, SearchableSelect } from '../../_dsfr/index';

import * as yup from 'yup';
import { ContactPoint, DraftContactPoint } from '../../../../../shared/models/ContactPoint';
import { emailValidator, useForm } from '../../../hooks/useForm';
import { useLocalityList } from '../../../hooks/useLocalityList';
import _ from 'lodash';
import AppTextInput from '../../_app/AppTextInput/AppTextInput';
import { createModal } from '@codegouvfr/react-dsfr/Modal';
import Tag from '@codegouvfr/react-dsfr/Tag';
import AppCheckbox from '../../_app/AppCheckbox/AppCheckbox';
import Button from '@codegouvfr/react-dsfr/Button';

interface Props {
  establishmentId: string;
  contactPoint?: ContactPoint;
  onSubmit: (contactPoint: DraftContactPoint | ContactPoint) => Promise<void>;
}

const ContactPointEditionModal = ({
  establishmentId,
  contactPoint,
  onSubmit,
}: Props) => {
  const modal = useMemo(
    () =>
      createModal({
        id: `contact-point-edition-modal-${contactPoint?.id}`,
        isOpenedByDefault: false,
      }),
    [contactPoint]
  );

  const { localitiesOptions, localities, localitiesGeoCodes } =
    useLocalityList(establishmentId);
  const [title, setTitle] = useState(contactPoint?.title ?? '');
  const [opening, setOpening] = useState(contactPoint?.opening ?? undefined);
  const [address, setAddress] = useState(contactPoint?.address ?? undefined);
  const [geoCodes, setGeoCodes] = useState(
    contactPoint?.geoCodes ?? localitiesGeoCodes
  );
  const [email, setEmail] = useState(contactPoint?.email ?? undefined);
  const [phone, setPhone] = useState(contactPoint?.phone ?? undefined);
  const [notes, setNotes] = useState(contactPoint?.notes ?? undefined);

  const filteredLocalityOptions = localitiesOptions.filter(
    (option) => !geoCodes.includes(option.value)
  );

  const shape = {
    title: yup.string().required('Veuillez saisir le titre du guichet'),
    opening: yup.string(),
    address: yup.string(),
    geoCodes: yup
      .array()
      .of(yup.string())
      .ensure()
      .min(1, 'Veuillez sélectionner au moins une commune'),
    email: emailValidator.nullable().optional(),
    phone: yup.string(),
    notes: yup.string(),
  };
  type FormShape = typeof shape;

  const form = useForm(yup.object().shape(shape), {
    title,
    opening,
    address,
    geoCodes,
    email,
    phone,
    notes,
  });

  const submitContactPointForm = async () => {
    await form.validate(async () => {
      await onSubmit({
        ...(contactPoint?.id ? { id: contactPoint.id } : {}),
        establishmentId,
        title: title!,
        opening,
        address,
        geoCodes,
        email,
        phone,
        notes,
      });
      modal.close();
    });
  };

  const isGlobal = _.isEqual(geoCodes, localitiesGeoCodes);

  return (
    <>
      {contactPoint ? (
        <Button
          iconId="fr-icon-edit-fill"
          onClick={modal.open}
          title="Modifier"
          priority="tertiary no outline"
          className="d-inline-block"
        />
      ) : (
        <Button className="float-right" onClick={modal.open}>
          Ajouter un guichet
        </Button>
      )}
      <modal.Component
        title={
          <>
            <span className="fr-icon-1x icon-left fr-icon-arrow-right-line ds-fr--v-middle" />
            {contactPoint?.id
              ? 'Modifier le guichet contact'
              : 'Ajouter un guichet contact'}
          </>
        }
        buttons={[
          {
            children: 'Annuler',
            priority: 'secondary',
          },
          {
            children: 'Enregistrer',
            onClick: submitContactPointForm,
            doClosesModal: false,
          },
        ]}
        style={{ textAlign: 'initial' }}
      >
        <Container as="section" fluid>
          <form id="user_form">
            <Row spacing="my-2w">
              <Col>
                <AppTextInput<FormShape>
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  inputForm={form}
                  inputKey="title"
                  label="Titre du guichet (obligatoire)"
                  required
                />
              </Col>
            </Row>
            <Row spacing="my-2w">
              <Col>
                <AppTextInput<FormShape>
                  textArea
                  value={opening}
                  onChange={(e) => setOpening(e.target.value)}
                  inputForm={form}
                  inputKey="opening"
                  label="Horaires et jours d’ouverture"
                  rows={2}
                />
              </Col>
            </Row>
            <Row spacing="my-2w">
              <Col>
                <AppTextInput<FormShape>
                  textArea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  inputForm={form}
                  inputKey="address"
                  label="Adresse postale"
                  rows={3}
                />
              </Col>
            </Row>
            <Row spacing="my-2w">
              <Col>
                <AppCheckbox
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setGeoCodes(e.target.checked ? localitiesGeoCodes : [])
                  }
                  checked={isGlobal}
                  label="Ce guichet concerne l'ensemble des communes de votre territoire."
                  hintText="Décochez cette case si vous voulez sélectionner seulement une ou plusieurs communes"
                />
              </Col>
            </Row>
            {!isGlobal && (
              <Row spacing="my-2w">
                <Col>
                  <SearchableSelect
                    options={filteredLocalityOptions}
                    label="Commune"
                    placeholder="Rechercher une commune"
                    onChange={(value: string) => {
                      if (value) {
                        setGeoCodes([...geoCodes, value]);
                      }
                    }}
                  />
                  {geoCodes.map((geoCode) => (
                    <Tag
                      key={geoCode}
                      onClick={() =>
                        setGeoCodes(geoCodes.filter((v) => v !== geoCode))
                      }
                      iconId="fr-icon-close-line"
                    >
                      {localities?.find((_) => _.geoCode === geoCode)?.name}
                    </Tag>
                  ))}
                  {form.messageType('geoCodes') === 'error' && (
                    <p className="fr-error-text">{form.message('geoCodes')}</p>
                  )}
                </Col>
              </Row>
            )}
            <Row spacing="my-2w">
              <Col n="6">
                <AppTextInput<FormShape>
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  inputForm={form}
                  inputKey="phone"
                  label="Téléphone"
                />
              </Col>
            </Row>
            <Row spacing="my-2w">
              <Col>
                <AppTextInput<FormShape>
                  value={email}
                  type="email"
                  onChange={(e) => setEmail(e.target.value)}
                  inputForm={form}
                  inputKey="email"
                  label="Adresse email"
                />
              </Col>
            </Row>
            <Row spacing="my-2w">
              <Col>
                <AppTextInput<FormShape>
                  textArea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  label="Notes"
                  inputForm={form}
                  inputKey="notes"
                  rows={3}
                />
              </Col>
            </Row>
          </form>
        </Container>
      </modal.Component>
    </>
  );
};

export default ContactPointEditionModal;
