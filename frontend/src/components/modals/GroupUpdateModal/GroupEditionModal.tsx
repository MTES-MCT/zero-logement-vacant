import { yupResolver } from '@hookform/resolvers/yup';
import type { ButtonProps } from '@codegouvfr/react-dsfr/Button';
import { FormProvider, useForm } from 'react-hook-form';
import * as yup from 'yup';

import ConfirmationModal from '../ConfirmationModal/ConfirmationModal';
import type { Group } from '../../../models/Group';
import type { GroupPayload } from '../../../models/GroupPayload';
import HousingCount from '../../HousingCount/HousingCount';
import { Col, Row } from '../../_dsfr';
import AppTextInputNext from '../../_app/AppTextInput/AppTextInputNext';

const schema = yup.object({
  title: yup.string()
    .max(64, 'La longueur maximale du titre du groupe est de 64 caractères.')
    .required('Veuillez donner un nom au groupe pour confirmer'),
  description: yup.string()
    .max(
      1000,
      'La longueur maximale de la description du groupe est de 1000 caractères.'
    )
    .required('Veuillez donner une description au groupe pour confirmer')
}).required();
type Schema = yup.InferType<typeof schema>;

interface Props {
  title: string;
  housingCount?: number;
  modalId?: string;
  openingButtonProps?: Omit<
    Exclude<ButtonProps, ButtonProps.AsAnchor>,
    'onClick'
  >;
  group?: Partial<
    Pick<Group, 'title' | 'description' | 'housingCount' | 'ownerCount'>
  >;
  onSubmit: (group: GroupPayload) => void;
}

function GroupEditionModal(props: Props) {
  const modalId = props.modalId ?? 'group-edition-modal';

  const form = useForm<Schema>({
    values: {
      title: props.group?.title ?? '',
      description: props.group?.description ?? ''
    },
    resolver: yupResolver(schema)
  });

  function handleSubmit(payload: Schema): void {
    props.onSubmit({
      title: payload.title,
      description: payload.description
    });
  }

  const housingCount = props.group?.housingCount ?? 0;
  const ownerCount = props.group?.ownerCount ?? 0;

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)}>
        <ConfirmationModal
          modalId={modalId}
          openingButtonProps={{
            children: 'Créer un nouveau groupe',
            iconId: 'fr-icon-add-line',
            iconPosition: 'left',
            size: 'small',
            priority: 'secondary',
            ...props.openingButtonProps
          }}
          size="large"
          title={props.title}
          onSubmit={form.handleSubmit(handleSubmit)}
        >
          {housingCount > 0 && ownerCount > 0 && (
            <HousingCount housingCount={housingCount} ownerCount={ownerCount} />
          )}
          <Row gutters>
            <Col>
              <AppTextInputNext
                name="title"
                label="Nom du groupe (obligatoire)"
              />
              <AppTextInputNext
                name="description"
                label="Description (obligatoire)"
                textArea
                nativeTextAreaProps={{
                  rows: 4
                }}
              />
            </Col>
          </Row>
        </ConfirmationModal>
      </form>
    </FormProvider>
  );
}

export default GroupEditionModal;