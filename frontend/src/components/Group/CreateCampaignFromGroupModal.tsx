import { yupResolver } from '@hookform/resolvers/yup';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useForm, type SubmitHandler } from 'react-hook-form';
import schemas from '@zerologementvacant/schemas';
import { object, string, type InferType } from 'yup';
import { createPortal } from 'react-dom';

import AppTextInputNext from '~/components/_app/AppTextInput/AppTextInputNext';
import {
  createConfirmationModal,
  type ConfirmationModalOptions,
  type ConfirmationModalProps
} from '~/components/modals/ConfirmationModal/ConfirmationModalNext';
import Icon from '~/components/ui/Icon';
import type { Campaign } from '~/models/Campaign';
import type { Group } from '~/models/Group';
import { pluralize } from '~/utils/stringUtils';

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
  description: string().trim().optional().default(''),
  sentAt: schemas.dateString.optional().nullable().default(null)
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
          sentAt: data.sentAt
        });
      };

      const component = (
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <modal.Component
            size="large"
            {...rest}
            onClose={form.reset}
            title="Créer une campagne"
          >
            <Stack direction="row" spacing="1rem" useFlexGap sx={{ mt: '-1rem', mb: '0.5rem' }}>
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

            <Typography variant="body2" sx={{ mb: '0.25rem' }}>
              Une fois la campagne créée, les logements « Non suivi » passeront « En attente de retour ».
            </Typography>

            <Box sx={{ '& .fr-input-group': { marginBottom: '0.75rem' } }}>
              <AppTextInputNext<FormSchema>
                label="Nom (obligatoire)"
                name="title"
                control={form.control}
              />

              <AppTextInputNext<FormSchema>
                label="Description"
                hintText="Vous pouvez par exemple définir les critères de votre campagne, comment vous l'avez construite, le planning de celle-ci, etc."
                name="description"
                control={form.control}
                textArea
                nativeTextAreaProps={{ rows: 2 }}
              />

              <AppTextInputNext<FormSchema>
                label="Date d'envoi"
                name="sentAt"
                control={form.control}
                nativeInputProps={{ type: 'date' }}
                mapValue={(value) => value ?? ''}
                contramapValue={(value) => value || null}
              />
            </Box>

          </modal.Component>
        </form>
      );

      return createPortal(component, document.body);
    }
  };
}
