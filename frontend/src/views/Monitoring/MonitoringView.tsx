import React, { useEffect, useState } from 'react';
import { Button, Col, Container, Row, Table, Title } from '@dataesr/react-dsfr';
import {
  fetchEstablishmentData,
  fetchHousingByStatusCount,
} from '../../store/actions/monitoringAction';
import { EstablishmentData } from '../../models/Establishment';
import { differenceInDays, format, formatDuration } from 'date-fns';
import { fr } from 'date-fns/locale';
import { HousingStates, HousingStatus } from '../../models/HousingState';
import AppMultiSelect from '../../components/AppMultiSelect/AppMultiSelect';
import { useEstablishments } from '../../hooks/useEstablishments';
import FilterBadges from '../../components/FiltersBadges/FiltersBadges';
import { MonitoringFilters } from '../../models/MonitoringFilters';
import { dataYearsIncludedOptions } from '../../models/HousingFilters';
import { numberSort, percent } from '../../utils/numberUtils';
import { dateSort, durationSort } from '../../utils/dateUtils';
import { Link } from 'react-router-dom';
import { hideLoading, showLoading } from 'react-redux-loading-bar';
import monitoringService from '../../services/monitoring.service';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useAppDispatch, useAppSelector } from '../../hooks/useStore';

const MonitoringView = () => {
  useDocumentTitle('Suivi');
  const dispatch = useAppDispatch();
  const { availableEstablishmentOptions } = useEstablishments();

  const {
    establishmentData,
    housingByStatusCount,
    housingByStatusCountFilters,
  } = useAppSelector((state) => state.monitoring);
  const [monitoringFilters, setMonitoringFilters] = useState<MonitoringFilters>(
    housingByStatusCountFilters
  );

  useEffect(() => {
    dispatch(
      fetchEstablishmentData({
        ...housingByStatusCountFilters,
        ...monitoringFilters,
      })
    );
    dispatch(
      fetchHousingByStatusCount({
        ...housingByStatusCountFilters,
        ...monitoringFilters,
      })
    );
  }, [dispatch, monitoringFilters]); //eslint-disable-line react-hooks/exhaustive-deps

  const exportMonitoring = async () => {
    dispatch(showLoading());
    await monitoringService
      .exportMonitoring(monitoringFilters)
      .then((response) => {
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(response);
        link.download = `export_monitoring_${format(
          new Date(),
          'yyyyMMdd_HHmmss'
        )}.xlsx`;

        document.body.appendChild(link);

        link.click();
        setTimeout(function () {
          dispatch(hideLoading());
          window.URL.revokeObjectURL(link.href);
        }, 200);
      });
  };

  const rowNumberColumn = {
    name: 'number',
    render: ({ rowNumber }: any) => <>#{rowNumber}</>,
  };

  const establishmentColumn = {
    name: 'name',
    label: 'Collectivité',
    render: ({ name }: EstablishmentData) => <>{name}</>,
    sortable: true,
  };

  const housingCountColumn = {
    name: 'housingCount',
    label: 'Nombre de logements vacants',
    render: ({ housingCount }: EstablishmentData) => <div>{housingCount}</div>,
    sortable: true,
    sort: (e1: EstablishmentData, e2: EstablishmentData) =>
      numberSort(e1.housingCount, e2.housingCount),
  };

  const firstActivationColumn = {
    name: 'firstActivatedAt',
    label: 'Date de première inscription',
    render: ({ firstActivatedAt }: EstablishmentData) => (
      <div>
        {firstActivatedAt && (
          <>
            {format(firstActivatedAt, 'dd/MM/yyyy')} <br />(
            {differenceInDays(new Date(), firstActivatedAt)} jours)
          </>
        )}
      </div>
    ),
    sortable: true,
    sort: (e1: EstablishmentData, e2: EstablishmentData) =>
      dateSort(e1.firstActivatedAt, e2.firstActivatedAt),
  };

  const lastAuthenticationColumn = {
    name: 'lastAuthenticatedAt',
    label: 'Date de dernière connexion',
    render: ({ lastAuthenticatedAt }: EstablishmentData) => (
      <div>
        {lastAuthenticatedAt && (
          <>{format(lastAuthenticatedAt, 'dd/MM/yyyy')}</>
        )}
      </div>
    ),
    sortable: true,
    sort: (e1: EstablishmentData, e2: EstablishmentData) =>
      dateSort(e1.lastAuthenticatedAt, e2.lastAuthenticatedAt),
  };

  const lastMonthUpdatesCountColumn = {
    name: 'lastMonthUpdatesCount',
    label: 'Nombre de dossiers mis à jour dans les 30 derniers jours',
    render: ({ lastMonthUpdatesCount }: EstablishmentData) => (
      <div>{lastMonthUpdatesCount}</div>
    ),
    sortable: true,
    sort: (e1: EstablishmentData, e2: EstablishmentData) =>
      numberSort(e1.lastMonthUpdatesCount, e2.lastMonthUpdatesCount),
  };

  const campaignsCountColumn = {
    name: 'campaignsCount',
    label: 'Nombre de campagnes',
    render: ({ campaignsCount }: EstablishmentData) => (
      <div>{campaignsCount}</div>
    ),
    sortable: true,
    sort: (e1: EstablishmentData, e2: EstablishmentData) =>
      numberSort(e1.campaignsCount, e2.campaignsCount),
  };

  const contactedHousingCountColumn = {
    name: 'contactedHousingCount',
    label: 'Nombre de logements contactés',
    render: ({ housingCount, contactedHousingCount }: EstablishmentData) => (
      <div>
        {contactedHousingCount} ({percent(contactedHousingCount, housingCount)}
        %)
      </div>
    ),
    sortable: true,
    sort: (e1: EstablishmentData, e2: EstablishmentData) =>
      numberSort(e1.contactedHousingCount, e2.contactedHousingCount),
  };

  const contactedHousingPerCampaignColumn = {
    name: 'contactedHousingPerCampaign',
    label: 'Nombre de logements contactés par campagne',
    render: ({
      housingCount,
      contactedHousingPerCampaign,
    }: EstablishmentData) => (
      <div>
        {contactedHousingPerCampaign} (
        {percent(contactedHousingPerCampaign, housingCount)}%)
      </div>
    ),
    sortable: true,
    sort: (e1: EstablishmentData, e2: EstablishmentData) =>
      numberSort(
        e1.contactedHousingPerCampaign,
        e2.contactedHousingPerCampaign
      ),
  };

  const lastCampaignSendingDateColumn = {
    name: 'lastCampaignSendingDate',
    label: "Date d'envoi de la dernière campagne",
    render: ({ lastCampaignSendingDate }: EstablishmentData) => (
      <div>
        {lastCampaignSendingDate && (
          <>
            {format(lastCampaignSendingDate, 'dd/MM/yyyy')} <br />(
            {differenceInDays(new Date(), lastCampaignSendingDate)} jours)
          </>
        )}
      </div>
    ),
    sortable: true,
    sort: (e1: EstablishmentData, e2: EstablishmentData) =>
      dateSort(e1.lastCampaignSendingDate, e2.lastCampaignSendingDate),
  };

  const delayBetweenCampaignsColumn = {
    name: 'delayBetweenCampaigns',
    label: 'Temps moyen d’envoi entre 2 campagnes',
    render: ({ delayBetweenCampaigns }: EstablishmentData) => (
      <div>
        {delayBetweenCampaigns && (
          <>
            {formatDuration(delayBetweenCampaigns, {
              format: ['months', 'days'],
              locale: fr,
            })}
          </>
        )}
      </div>
    ),
    sortable: true,
    sort: (e1: EstablishmentData, e2: EstablishmentData) =>
      durationSort(e1.delayBetweenCampaigns, e2.delayBetweenCampaigns),
  };

  const firstCampaignSendingDateColumn = {
    name: 'firstCampaign',
    label: "Temps d'envoi de la première campagne après inscription",
    render: ({ firstCampaignSentDelay }: EstablishmentData) => (
      <div>
        {firstCampaignSentDelay ? <>{firstCampaignSentDelay} jours</> : null}
      </div>
    ),
    sortable: true,
    sort: (e1: EstablishmentData, e2: EstablishmentData) =>
      numberSort(e1.firstCampaignSentDelay, e2.firstCampaignSentDelay),
  };

  const viewColumn = {
    name: 'view',
    headerRender: () => '',
    render: ({ id }: EstablishmentData) => (
      <Link
        title="Afficher"
        to={window.location.pathname + '/etablissement/' + id}
        className="ds-fr--inline fr-link"
      >
        Afficher
        <span className="ri-1x icon-right ri-arrow-right-line ds-fr--v-middle" />
      </Link>
    ),
  };

  const housingWithStatusCount = (
    status: HousingStatus,
    subStatus?: string
  ) => {
    return housingByStatusCount
      ?.filter((_) => _.status === status)
      .filter((_) => (subStatus ? _.subStatus === subStatus : true))
      .reduce((count, h) => Number(h.count) + count, 0);
  };

  const housingWithStatusNoPrecisionsCount = (status?: HousingStatus) => {
    return housingByStatusCount
      ?.filter((_) => (status ? _.status === status : _.status))
      .filter((_) => !_.precisions?.length)
      .reduce((count, h) => Number(h.count) + count, 0);
  };

  const housingWithStatusPrecisions = (
    status: HousingStatus,
    subStatus: string
  ) => {
    return housingByStatusCount
      ?.filter((_) => _.status === status)
      .filter((_) => _.subStatus === subStatus)
      .reduce(
        (acc, value) => [
          ...acc,
          ...(value.precisions ?? []).map((_) => ({
            precision: _,
            count: value.count,
          })),
        ],
        [] as { precision: string; count: number }[]
      )
      .reduce((acc, value) => {
        const found = acc.find((_) => _.precision === value.precision);
        if (!found) {
          acc.push(value);
        } else {
          found.count = Number(found.count) + Number(value.count);
        }
        return acc;
      }, [] as { precision: string; count: number }[]);
  };

  const HousingStatusStats = ({ status }: { status: HousingStatus }) => {
    const state = HousingStates.find((_) => _.status === status);

    return (
      <Row className="bordered-b fr-py-1w">
        <Col n="4">
          <b>{state?.title}</b> :&nbsp;
          {housingByStatusCount ? housingWithStatusCount(status) : '...'}
        </Col>
        <Col>
          {state?.subStatusList?.map((subStatus, index) => (
            <Row className="bordered-b fr-py-1w" key={subStatus + '_' + index}>
              <Col>
                <b>{subStatus.title}</b> :&nbsp;
                {housingByStatusCount
                  ? housingWithStatusCount(status, subStatus.title)
                  : '...'}
              </Col>
              <Col>
                {housingWithStatusPrecisions(status, subStatus.title)?.map(
                  (_, index) => (
                    <Row key={status + '_' + subStatus + '_' + index}>
                      <Col>
                        {_.precision} :&nbsp;{_.count}
                      </Col>
                    </Row>
                  )
                )}
              </Col>
            </Row>
          ))}
          <Row className="fr-py-1w">
            <Col>
              <b>Sans précisions</b> :&nbsp;
              {housingByStatusCount
                ? housingWithStatusNoPrecisionsCount(status)
                : '...'}
            </Col>
          </Row>
        </Col>
      </Row>
    );
  };

  const columns = () => [
    rowNumberColumn,
    establishmentColumn,
    housingCountColumn,
    firstActivationColumn,
    lastAuthenticationColumn,
    lastMonthUpdatesCountColumn,
    campaignsCountColumn,
    contactedHousingCountColumn,
    contactedHousingPerCampaignColumn,
    lastCampaignSendingDateColumn,
    delayBetweenCampaignsColumn,
    firstCampaignSendingDateColumn,
    viewColumn,
  ];

  return (
    <>
      <div className="bg-100">
        <Container as="section" spacing="pb-1w">
          <Row gutters>
            <Col n="4">
              <Title as="h1">Suivi</Title>
            </Col>
            <Col n="4">
              <AppMultiSelect
                label="Etablissements"
                options={availableEstablishmentOptions}
                initialValues={housingByStatusCountFilters.establishmentIds}
                onChange={(values) =>
                  setMonitoringFilters({
                    ...monitoringFilters,
                    establishmentIds: values,
                  })
                }
              />
            </Col>
            <Col n="2">
              <AppMultiSelect
                label="Millésimes"
                options={dataYearsIncludedOptions}
                initialValues={(
                  housingByStatusCountFilters.dataYears ?? []
                ).map((_) => String(_))}
                onChange={(values) =>
                  setMonitoringFilters({
                    ...monitoringFilters,
                    dataYears: values.map((_) => Number(_)),
                  })
                }
              />
            </Col>
            <Col n="2">
              <Button
                title="Exporter"
                secondary
                onClick={() => exportMonitoring()}
                data-testid="export-campaign-button"
                className="float-right fr-mr-2w"
                icon="ri-download-line"
              >
                Exporter
              </Button>
            </Col>
          </Row>
        </Container>
      </div>
      <Container as="section" spacing="pt-2w">
        <Row className="fr-pb-2w">
          <FilterBadges
            filters={housingByStatusCountFilters.establishmentIds}
            options={availableEstablishmentOptions}
            onChange={(values) =>
              setMonitoringFilters({
                ...monitoringFilters,
                establishmentIds: values,
              })
            }
          />
          <FilterBadges
            filters={(housingByStatusCountFilters.dataYears ?? []).map((_) =>
              String(_)
            )}
            options={dataYearsIncludedOptions}
            onChange={(values) =>
              setMonitoringFilters({
                ...monitoringFilters,
                dataYears: values.map((_) => Number(_)),
              })
            }
          />
        </Row>
      </Container>
      <Container as="section" className="bordered fr-mb-4w">
        <Row className="bordered-b fr-py-1w">
          <Col n="4">
            <b>En attente de retour</b> :&nbsp;
            {housingByStatusCount
              ? housingWithStatusCount(HousingStatus.Waiting)
              : '...'}
          </Col>
        </Row>
        <HousingStatusStats status={HousingStatus.FirstContact} />
        <HousingStatusStats status={HousingStatus.InProgress} />
        <HousingStatusStats status={HousingStatus.Exit} />
        <HousingStatusStats status={HousingStatus.NotVacant} />
        <HousingStatusStats status={HousingStatus.NoAction} />
        <Row className="fr-py-1w">
          <Col>
            <b>Nombre de logements total</b> :&nbsp;
            {housingByStatusCount
              ? housingByStatusCount
                  ?.map((_) => _.count)
                  .reduce((c1: number, c2) => Number(c1) + Number(c2), 0)
              : '...'}
          </Col>
        </Row>
        <Row className="fr-py-1w">
          <Col>
            <b>Nombre de logements contactés sans précisions</b> :&nbsp;
            {housingByStatusCount
              ? housingWithStatusNoPrecisionsCount()
              : '...'}
          </Col>
        </Row>
      </Container>
      <Container as="section" fluid>
        <div>
          {establishmentData && (
            <Table
              caption="Collectivités"
              captionPosition="none"
              rowKey="id"
              data={establishmentData.map((_, index) => ({
                ..._,
                rowNumber: index + 1,
              }))}
              columns={columns()}
              fixedLayout={true}
              className="zlv-fixed-table with-row-number"
            />
          )}
        </div>
      </Container>
    </>
  );
};

export default MonitoringView;
