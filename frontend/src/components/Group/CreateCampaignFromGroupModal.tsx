import Alert from '@codegouvfr/react-dsfr/Alert';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { yupResolver } from '@hookform/resolvers/yup';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { date, object, string, type InferType } from 'yup';

import type { Campaign } from '~/models/Campaign';
import type { Group } from '~/models/Group';
import { pluralize } from '~/utils/stringUtils';
import AppTextInputNext from '~/components/_app/AppTextInput/AppTextInputNext';
import Icon from '~/components/ui/Icon';
import {
  createConfirmationModal,
  type ConfirmationModalOptions,
  type ConfirmationModalProps
} from '~/components/modals/ConfirmationModal/ConfirmationModalNext';

export type CreateCampaignFromGroupModalOptions =
  Partial<ConfirmationModalOptions>;

export type CreateCampaignFromGroupModalProps = Omit<
  ConfirmationModalProps,
  'title' | 'children' | 'onSubmit'
> & {
  group: Group;
  onSubmit(campaign: Pick<Campaign, 'title' | 'description' | 'sentAt'>): void;
};

const schema = object({
  title: string().trim().required('Veuillez renseigner un nom'),
  description: string().trim().required('Veuillez renseigner une description'),
  sentAt: date().optional().nullable().default(null)
});

type FormSchema = InferType<typeof schema>;

export function createCampaignFromGroupModal(
  options?: Readonly<CreateCampaignFromGroupModalOptions>
) {
  const modal = createConfirmationModal({
    id: options?.id ?? 'create-campaign-from-group-modal',
    isOpenedByDefault: options?.isOpenedByDefault ?? false
  });

  return {
    ...modal,
    Component(props: Readonly<CreateCampaignFromGroupModalProps>) {
      const { group, onSubmit, ...rest } = props;

      const housing = pluralize(group.housingCount)('logement');
      const owners = pluralize(group.ownerCount)('propriétaire');

      const form = useForm<FormSchema>({
        resolver: yupResolver(schema),
        defaultValues: {
          title: '',
          description: '',
          sentAt: null
        },
        mode: 'onBlur'
      });

      const handleSubmit: SubmitHandler<FormSchema> = (data) => {
        onSubmit({
          title: data.title,
          description: data.description,
          sentAt: data.sentAt?.toISOString()
        });
      };

      return (
        <modal.Component
          {...rest}
          title="Créer une campagne"
          onSubmit={form.handleSubmit(handleSubmit)}
        >
          <Stack direction="row" spacing="1rem" useFlexGap sx={{ mb: 2 }}>
            <Stack
              direction="row"
              spacing="0.25rem"
              useFlexGap
              sx={{ alignItems: 'center' }}
            >
              <Icon name="ri-home-2-line" size="sm" color="inherit" />
              <Typography component="span" variant="body2">
                {group.housingCount} {housing}
              </Typography>
            </Stack>
            <Stack
              direction="row"
              spacing="0.25rem"
              useFlexGap
              sx={{ alignItems: 'center' }}
            >
              <Icon name="ri-user-line" size="sm" color="inherit" />
              <Typography component="span" variant="body2">
                {group.ownerCount} {owners}
              </Typography>
            </Stack>
          </Stack>

          <AppTextInputNext<FormSchema>
            label="Nom (obligatoire)"
            name="title"
            control={form.control}
          />

          <AppTextInputNext<FormSchema>
            label="Description (obligatoire)"
            hintText="Vous pouvez par exemple définir les critères de votre campagne, comment vous l'avez construite, le planning de celle-ci, etc."
            name="description"
            control={form.control}
            textArea
          />

          <AppTextInputNext<FormSchema, FormSchema['sentAt']>
            label="Date d'envoi"
            name="sentAt"
            control={form.control}
            nativeInputProps={{ type: 'date' }}
            mapValue={(value) => value?.toISOString().slice(0, 10) ?? ''}
            contramapValue={(value) => (value ? new Date(value) : null)}
          />

          <Alert
            severity="info"
            small
            description="Une fois la campagne créée : les logements seront enregistrés comme ayant fait l'objet d'un courrier ; le statut des logements « Non suivi » passera au statut « En attente de retour » ; vous pourrez télécharger les fichiers vous permettant d'effectuer votre publipostage."
          />
        </modal.Component>
      );
    }
  };
}
