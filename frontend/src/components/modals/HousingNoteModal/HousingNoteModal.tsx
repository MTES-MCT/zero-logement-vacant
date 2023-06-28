import {
  Button,
  Container,
  Modal,
  ModalClose,
  ModalContent,
  ModalFooter,
  ModalTitle,
  Select,
} from '@dataesr/react-dsfr';
import { useMemo, useState } from 'react';
import * as yup from 'yup';

import { Housing } from '../../../models/Housing';
import { useForm } from '../../../hooks/useForm';
import { CONTACT_KINDS } from '../../../models/ContactKind';
import { DefaultOption, Separator } from '../../../models/SelectOption';
import AppMultiSelect from '../../AppMultiSelect/AppMultiSelect';
import { Owner } from '../../../models/Owner';
import { HousingNoteCreation, OwnerNoteCreation } from '../../../models/Note';
import AppTextInput from '../../AppTextInput/AppTextInput';

interface HousingNoteModalProps {
  housingList: Housing[];
  owner?: Owner;
  onClose: () => void;
  onSubmitAboutOwner?: (note: OwnerNoteCreation) => Promise<void>;
  onSubmitAboutHousing: (note: HousingNoteCreation) => Promise<void>;
}

const ALL = 'all';
const OWNER = 'owner';

function HousingNoteModal(props: HousingNoteModalProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [contactKind, setContactKind] = useState(DefaultOption.value);
  const [selectedHousing, setSelectedHousing] = useState<string[]>(
    props.onSubmitAboutOwner ? [ALL] : props.housingList.map((_) => _.id)
  );

  const allHousingSelected = useMemo<boolean>(() => {
    return selectedHousing.includes(ALL);
  }, [selectedHousing]);

  const ownerSelected = useMemo<boolean>(() => {
    return selectedHousing.includes(OWNER);
  }, [selectedHousing]);

  const allOption = {
    value: ALL,
    label: `Tous les logements (${props.housingList.length})`,
    disabled: ownerSelected,
  };
  const ownerOption = {
    value: OWNER,
    label: 'Propriétaire',
    disabled: allHousingSelected,
  };

  function selectHousing(ids: string[]): void {
    if (ids.includes(OWNER)) {
      setSelectedHousing([ownerOption.value]);
      return;
    }

    if (ids.includes(ALL)) {
      setSelectedHousing([allOption.value]);
      return;
    }

    setSelectedHousing(ids);
  }

  const contactKindOptions = [
    DefaultOption,
    ...CONTACT_KINDS.map((kind) => {
      return { label: kind, value: kind };
    }),
  ];

  const housingOptions = [
    ...(props.onSubmitAboutOwner ? [ownerOption, allOption, Separator] : []),
    ...props.housingList.map((housing) => ({
      value: housing.id,
      label: `${housing.rawAddress[0]} (i.f. : ${housing.invariant})`,
      disabled: allHousingSelected || ownerSelected,
    })),
  ];

  const shape = {
    title: yup.string().required('Veuillez donner un titre à votre note'),
    content: yup.string().required('Veuillez ajouter une note'),
    contactKind: yup
      .string()
      .required('Veuillez sélectionner un type d’interaction'),
    housing: yup
      .array()
      .of(yup.string())
      .required('Veuillez sélectionner le(s) logement(s) concerné(s)')
      .ensure()
      .min(1, 'Sélectionnez au moins 1 élément'),
  };
  type FormShape = typeof shape;

  const form = useForm(yup.object().shape(shape), {
    title,
    content,
    contactKind,
    housing: selectedHousing,
  });

  async function submit() {
    const onSubmit = () => {
      if (selectedHousing.includes(OWNER) && props.owner) {
        return props.onSubmitAboutOwner!({
          title,
          content,
          contactKind,
          owner: props.owner,
        });
      }

      if (selectedHousing.includes(ALL)) {
        return props.onSubmitAboutHousing({
          title,
          content,
          contactKind,
          housingList: props.housingList,
        });
      }

      return props.onSubmitAboutHousing({
        title,
        content,
        contactKind,
        housingList: props.housingList.filter((_) =>
          selectedHousing.includes(_.id)
        ),
      });
    };

    await form.validate(onSubmit);
  }

  return (
    <Modal isOpen hide={() => props.onClose()} size="lg">
      <ModalClose hide={() => props.onClose()} title="Fermer la fenêtre">
        Fermer
      </ModalClose>
      <ModalTitle>
        <span className="ri-1x icon-left ri-arrow-right-line ds-fr--v-middle" />
        Ajouter une note
      </ModalTitle>
      <ModalContent>
        <Container as="section" fluid>
          <AppTextInput<FormShape>
            label="Titre (obligatoire)"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            inputForm={form}
            inputKey="title"
            required
          />
          <AppTextInput<FormShape>
            label="Notes (obligatoire)"
            textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            inputForm={form}
            inputKey="content"
            required
          />
          <Select
            label="Types d'interaction (obligatoire)"
            options={contactKindOptions}
            selected={contactKind}
            onChange={async (e) => {
              setContactKind(e.target.value);
              await form.validateAt('contactKind');
            }}
            messageType={form.messageType('contactKind') as 'valid' | 'error'}
            message={form.message('contactKind')}
            required
          />
          <AppMultiSelect
            defaultOption="Sélectionner"
            label="Logement(s) concerné(s)"
            options={housingOptions}
            initialValues={selectedHousing}
            onChange={(e) => selectHousing(e)}
            messageType={form.messageType('housing')}
            message={form.message('housing')}
            size="md"
          />
        </Container>
      </ModalContent>
      <ModalFooter>
        <Button secondary className="fr-mr-2w" onClick={() => props.onClose()}>
          Annuler
        </Button>
        <Button onClick={() => submit()}>Enregistrer</Button>
      </ModalFooter>
    </Modal>
  );
}

export default HousingNoteModal;
