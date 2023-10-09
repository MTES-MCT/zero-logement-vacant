import React, { useEffect, useState } from 'react';

import { Col, Row, Text, Title } from '../_dsfr';

import styles from '../../views/Campaign/campaign.module.scss';
import { useHistory } from 'react-router-dom';
import {
  Campaign,
  CampaignBundle,
  CampaignBundleId,
  campaignBundleIdUrlFragment,
  CampaignNotSentSteps,
  CampaignNumberSort,
  CampaignSteps,
} from '../../models/Campaign';
import { useCampaignList } from '../../hooks/useCampaignList';
import {
  TrackEventActions,
  TrackEventCategories,
} from '../../models/TrackEvent';
import {
  deleteCampaignBundle,
  validCampaignStep,
} from '../../store/actions/campaignAction';
import { useMatomo } from '@datapunt/matomo-tracker-react';
import ConfirmationModal from '../modals/ConfirmationModal/ConfirmationModal';
import { format } from 'date-fns';
import CampaignExportModal from '../modals/CampaignExportModal/CampaignExportModal';
import * as yup from 'yup';
import { dateValidator, useForm } from '../../hooks/useForm';
import CampaignBundleStats from '../CampaignBundle/CampaignBundleStats';
import CampaignBundleInfos from '../CampaignBundle/CampaignBundleInfos';
import CampaignBundleTitle from '../CampaignBundle/CampaignBundleTitle';
import { dateShortFormat, parseDateInput } from '../../utils/dateUtils';
import { useCampaignBundleList } from '../../hooks/useCampaignBundleList';
import { useCampaignBundle } from '../../hooks/useCampaignBundle';
import { useAppDispatch } from '../../hooks/useStore';
import AppTextInput from '../_app/AppTextInput/AppTextInput';
import { Alert } from '@codegouvfr/react-dsfr/Alert';
import Button from '@codegouvfr/react-dsfr/Button';
import Tag from '@codegouvfr/react-dsfr/Tag';
import Stepper from '@codegouvfr/react-dsfr/Stepper';

interface ItemProps {
  campaignBundle: CampaignBundle;
  withDeletion: boolean;
}

const CampaignBundleItem = ({
  campaignBundle,
  withDeletion = false,
}: ItemProps) => {
  const dispatch = useAppDispatch();
  const { trackEvent } = useMatomo();
  const history = useHistory();
  const {
    step,
    reminderCampaigns,
    isDeletable,
    isCampaign,
    hasReminders,
    isLastReminder,
  } = useCampaignBundle(campaignBundle);
  const campaignList = useCampaignList();

  const [sendingDate, setSendingDate] = useState(
    format(new Date(), 'yyyy-MM-dd')
  );
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);

  const shape = { sendingDate: dateValidator };
  type FormShape = typeof shape;

  const form = useForm(yup.object().shape(shape), {
    sendingDate,
  });

  const onSendingCampaign = async (campaignId: string) => {
    await form.validate(() => {
      trackEvent({
        category: TrackEventCategories.Campaigns,
        action: TrackEventActions.Campaigns.ValidStep(CampaignSteps.Sending),
      });
      dispatch(
        validCampaignStep(campaignId, CampaignSteps.Sending, {
          sendingDate: parseDateInput(sendingDate),
          skipConfirmation: true,
        })
      );
    });
  };

  const onDeleteCampaign = (campaignBundleId: CampaignBundleId) => {
    trackEvent({
      category: TrackEventCategories.Campaigns,
      action: TrackEventActions.Campaigns.Delete,
    });
    dispatch(deleteCampaignBundle(campaignBundleId));
  };

  const onArchiveCampaign = (campaignIds: string[]) => {
    campaignIds.forEach((campaignId) => {
      trackEvent({
        category: TrackEventCategories.Campaigns,
        action: TrackEventActions.Campaigns.Archive,
      });

      dispatch(validCampaignStep(campaignId, CampaignSteps.Archived));
    });
  };

  return (
    <div
      key={`CampaignBundle_${campaignBundle.campaignIds.join('-')}`}
      className={styles.campaignCard}
    >
      <Row gutters alignItems="top" spacing="mb-1w">
        <Col>
          <CampaignBundleTitle campaignBundle={campaignBundle} as="h2" />
          <div>
            <CampaignBundleInfos
              campaignBundle={campaignBundle}
              isGrey={true}
            />
            {step === CampaignSteps.Archived && (
              <CampaignBundleStats
                campaignBundle={campaignBundle}
                isArchived={true}
              />
            )}
          </div>
        </Col>
        {isCampaign && step !== CampaignSteps.Archived && (
          <Col n="6">
            {step === CampaignSteps.Export && (
              <div className="fr-p-3w bg-bf975">
                <Stepper
                  stepCount={3}
                  currentStep={1}
                  title="Vous avez créé l'échantillon."
                  nextTitle="Exporter le fichier de publipostage"
                />
                <CampaignExportModal campaignBundle={campaignBundle} />
              </div>
            )}
            {step === CampaignSteps.Sending && (
              <div className="fr-p-3w bg-bf975">
                <Stepper
                  stepCount={3}
                  currentStep={2}
                  title="Vous avez exporté l'échantillon."
                  nextTitle="Dater l'envoi de votre campagne"
                />
                <Row alignItems="top">
                  <Col className="fr-pr-1w">
                    <AppTextInput<FormShape>
                      value={sendingDate}
                      type="date"
                      onChange={(e) => setSendingDate(e.target.value)}
                      label="Date d'envoi"
                      inputForm={form}
                      inputKey="sendingDate"
                    />
                  </Col>
                  <Col className="fr-pt-4w">
                    <Button
                      priority="secondary"
                      onClick={() =>
                        onSendingCampaign(campaignBundle.campaignIds[0])
                      }
                    >
                      Confirmer la date d'envoi
                    </Button>
                  </Col>
                </Row>
              </div>
            )}
            {step === CampaignSteps.InProgress && (
              <div className="fr-pl-2w fr-py-3w bg-bf975">
                <Title as="h3" look="h6">
                  Suivi en cours
                </Title>
                <CampaignBundleStats
                  campaignBundle={campaignBundle}
                  isArchived={false}
                />
              </div>
            )}
          </Col>
        )}
      </Row>
      {hasReminders &&
        reminderCampaigns.map((campaign: Campaign) => (
          <div key={`Campaign_${campaign.id}`}>
            <hr className="fr-pb-1w fr-mt-1w" />
            <Row gutters alignItems="middle">
              <Col n="9">
                Relance n° {campaign.reminderNumber} (
                {dateShortFormat(campaign.createdAt)})
              </Col>
              <Col n="3" className="align-right">
                {isLastReminder(campaign.reminderNumber) &&
                  withDeletion &&
                  step !== CampaignSteps.Archived && (
                    <ConfirmationModal
                      onSubmit={() => onDeleteCampaign(campaign)}
                      modalId={`delete-${campaign.id}`}
                      openingButtonProps={{
                        children: 'Supprimer',
                        priority: 'tertiary no outline',
                        iconId: 'fr-icon-delete-bin-fill',
                      }}
                    >
                      <Text size="md">
                        Êtes-vous sûr de vouloir supprimer cette relance ?
                      </Text>
                      <Alert
                        description='Les statuts des logements "En attente de retour" repasseront en "Jamais contacté". Les autres statuts mis à jour ne seront pas modifiés.'
                        severity="info"
                        small
                      />
                    </ConfirmationModal>
                  )}
                <Button
                  priority="tertiary no outline"
                  onClick={() =>
                    history.push(
                      '/campagnes/' +
                        campaignBundleIdUrlFragment({
                          campaignNumber: campaign.campaignNumber,
                          reminderNumber: campaign.reminderNumber,
                        })
                    )
                  }
                  iconId="fr-icon-arrow-right-line"
                  iconPosition="right"
                  className="fix-vertical-align"
                >
                  Accéder
                </Button>
              </Col>
            </Row>
          </div>
        ))}
      <hr className="fr-pb-2w fr-mt-1w" />
      <Row>
        <Col className="align-right">
          {isDeletable && campaignBundle.campaignNumber && (
            <ConfirmationModal
              onSubmit={() => onDeleteCampaign(campaignBundle)}
              modalId={`delete-${campaignBundle.campaignNumber}`}
              openingButtonProps={{
                children: 'Supprimer',
                priority: 'tertiary no outline',
                iconId: 'fr-icon-delete-bin-fill',
              }}
            >
              <Text size="md">
                Êtes-vous sûr de vouloir supprimer cette campagne ?
              </Text>
              {campaignBundle.campaignNumber < (campaignList ?? []).length && (
                <Alert
                  description="Les campagnes suivantes seront renumérotées."
                  severity="info"
                  small
                />
              )}
              <Alert
                description='Les statuts des logements "En attente de retour" repasseront en "Jamais contacté". Les autres statuts mis à jour ne seront pas modifiés.'
                severity="info"
                small
              />
            </ConfirmationModal>
          )}
          {step === CampaignSteps.InProgress && (
            <ConfirmationModal
              onSubmit={() => onArchiveCampaign(campaignBundle.campaignIds)}
              modalId={`delete-${campaignBundle.campaignIds.join('-')}`}
              openingButtonProps={{
                children: 'Archiver',
                priority: 'secondary',
                iconId: 'fr-icon-archive-fill',
                className: 'fr-mr-2w',
              }}
            >
              <Text size="md">
                Êtes-vous sûr de vouloir archiver cette campagne{' '}
                {campaignBundle.campaignIds.length > 1
                  ? 'et ses relances '
                  : ''}{' '}
                ?
              </Text>
            </ConfirmationModal>
          )}
          <Button
            onClick={() =>
              history.push('/campagnes/C' + campaignBundle.campaignNumber)
            }
            iconId="fr-icon-arrow-right-line"
            iconPosition="right"
            className="fix-vertical-align"
          >
            {step === CampaignSteps.InProgress ? 'Accéder au suivi' : 'Accéder'}
          </Button>
        </Col>
      </Row>
    </div>
  );
};

interface Props {
  withDeletion?: boolean;
}

const CampaignBundleList = ({ withDeletion = false }: Props) => {
  const { campaignBundleList, stepsFilter, campaignBundlesCount } =
    useCampaignBundleList();

  const [campaignInProgressFilter, setCampaignInProgressFilter] =
    useState<boolean>(true);
  const [campaignNoSentFilter, setCampaignNotSentFilter] =
    useState<boolean>(true);
  const [outsideCampaignFilter, setOutsideCampaignInProgressFilter] =
    useState<boolean>(true);
  const [campaignArchivedFilter, setCampaignArchivedFilter] =
    useState<boolean>(false);
  const [filteredCampaignBundles, setFilteredCampaignBundles] = useState<
    CampaignBundle[] | undefined
  >(campaignBundleList);

  useEffect(
    () => {
      setFilteredCampaignBundles(
        campaignBundleList?.filter(
          (campaignBundle) =>
            (campaignInProgressFilter &&
              stepsFilter([CampaignSteps.InProgress])(campaignBundle)) ||
            (campaignNoSentFilter &&
              stepsFilter(CampaignNotSentSteps)(campaignBundle)) ||
            (outsideCampaignFilter &&
              stepsFilter([CampaignSteps.Outside])(campaignBundle)) ||
            (campaignArchivedFilter &&
              stepsFilter([CampaignSteps.Archived])(campaignBundle))
        )
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      campaignBundleList,
      campaignInProgressFilter,
      outsideCampaignFilter,
      campaignNoSentFilter,
      campaignArchivedFilter,
    ]
  );

  return (
    <>
      <div className="fr-tags-group fr-py-2w">
        <Tag
          small
          pressed={campaignInProgressFilter}
          nativeButtonProps={{
            onClick: () =>
              setCampaignInProgressFilter(!campaignInProgressFilter),
          }}
        >
          Suivi en cours ({campaignBundlesCount([CampaignSteps.InProgress])})
        </Tag>
        <Tag
          small
          pressed={campaignNoSentFilter}
          nativeButtonProps={{
            onClick: () => setCampaignNotSentFilter(!campaignNoSentFilter),
          }}
        >
          Campagne en attente d'envoi (
          {campaignBundlesCount(CampaignNotSentSteps)})
        </Tag>
        <Tag
          small
          pressed={campaignArchivedFilter}
          nativeButtonProps={{
            onClick: () => setCampaignArchivedFilter(!campaignArchivedFilter),
          }}
        >
          Campagne archivée ({campaignBundlesCount([CampaignSteps.Archived])})
        </Tag>
        <Tag
          small
          pressed={outsideCampaignFilter}
          nativeButtonProps={{
            onClick: () =>
              setOutsideCampaignInProgressFilter(!outsideCampaignFilter),
          }}
        >
          Hors campagne ({campaignBundlesCount([CampaignSteps.Outside])})
        </Tag>
      </div>
      {filteredCampaignBundles && !filteredCampaignBundles.length && (
        <Text>Aucune campagne</Text>
      )}
      {filteredCampaignBundles &&
        [...filteredCampaignBundles]
          .sort(CampaignNumberSort)
          .map((campaignBundle) => (
            <CampaignBundleItem
              campaignBundle={campaignBundle}
              withDeletion={withDeletion}
              key={campaignBundle.campaignIds.join('_')}
            />
          ))}
    </>
  );
};

export default CampaignBundleList;
