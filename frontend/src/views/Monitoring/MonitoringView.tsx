import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ApplicationState } from '../../store/reducers/applicationReducers';
import { Col, Container, Row, Table, Title } from '@dataesr/react-dsfr';
import AppBreadcrumb from '../../components/AppBreadcrumb/AppBreadcrumb';
import { fetchEstablishmentData, fetchHousingByStatusCount } from '../../store/actions/monitoringAction';
import { EstablishmentData } from '../../models/Establishment';
import { differenceInDays, format, formatDuration } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
    ExitWithoutSupportSubStatus,
    ExitWithPublicSupportSubStatus,
    ExitWithSupportSubStatus,
    HousingStatus, InProgressWithoutSupportSubStatus,
    InProgressWithPublicSupportSubStatus,
    InProgressWithSupportSubStatus,
} from '../../models/HousingState';


const MonitoringView = () => {

    const dispatch = useDispatch();
    const { establishmentData, housingByStatus} = useSelector((state: ApplicationState) => state.monitoring);


    useEffect(() => {
        dispatch(fetchEstablishmentData())
        dispatch(fetchHousingByStatusCount())
    }, [dispatch])

    const establishmentColumn = {
        name: 'establishment',
        label: 'Collectivité',
        render: ({ name }: EstablishmentData) =>
            <>
                {name}
            </>
    };

    const housingCountColumn = {
        name: 'housingCount',
        label: 'Nombre de logements vacants',
        render: ({ housingCount }: EstablishmentData) =>
            <>
                {housingCount}
            </>
    };

    const firstActivationColumn = {
        name: 'firstActivation',
        label: 'Date de première inscription',
        render: ({ firstActivatedAt }: EstablishmentData) => <>
            { firstActivatedAt && <>
                {format(firstActivatedAt, 'dd/MM/yyyy')} <br />({differenceInDays(new Date(), firstActivatedAt)} jours)
            </> }
        </>
    };

    const lastAuthenticationColumn = {
        name: 'lastAuthentication',
        label: 'Date de dernière connexion',
        render: ({ lastAuthenticatedAt }: EstablishmentData) => <>
            { lastAuthenticatedAt && <>
                {format(lastAuthenticatedAt, 'dd/MM/yyyy')}
            </> }
        </>
    };

    const lastMonthUpdatesCountColumn = {
        name: 'lastMonthUpdatesCount',
        label: 'Nombre de dossiers mis à jour dans les 30 derniers jours',
        render: ({ lastMonthUpdatesCount }: EstablishmentData) => <>
            {lastMonthUpdatesCount}
        </>
    };

    const campaignsCountColumn = {
        name: 'campaignsCount',
        label: 'Nombre de campagnes',
        render: ({ campaignsCount }: EstablishmentData) => <>
            {campaignsCount}
        </>
    };

    const contactedHousingCountColumn = {
        name: 'contactedHousingCount',
        label: 'Nombre de logements contactés',
        render: ({ housingCount, contactedHousingCount }: EstablishmentData) => <>
            {contactedHousingCount} ({Math.floor(contactedHousingCount / housingCount * 100)}%)
        </>
    };

    const contactedHousingPerCampaignColumn = {
        name: 'contactedHousingPerCampaign',
        label: 'Nombre de logements contactés',
        render: ({ housingCount, contactedHousingPerCampaign }: EstablishmentData) => <>
            {contactedHousingPerCampaign} ({Math.floor(contactedHousingPerCampaign / housingCount * 100)}%)
        </>
    };

    const lastCampaignSentAtColumn = {
        name: 'lastCampaign',
        label: 'Date d\'envoi de la dernière campagne',
        render: ({ lastCampaignSentAt }: EstablishmentData) => <>
            { lastCampaignSentAt && <>
                {format(lastCampaignSentAt, 'dd/MM/yyyy')} <br />({differenceInDays(new Date(), lastCampaignSentAt)} jours)
            </> }
        </>
    };

    const delayBetweenCampaignsColumn = {
        name: 'delayBetweenCampaigns',
        label: 'Temps moyen d’envoi entre 2 campagnes',
        render: ({ delayBetweenCampaigns }: EstablishmentData) => <>
            { formatDuration(delayBetweenCampaigns, { format: ['months', 'days'], locale: fr }) }
        </>
    };

    const firstCampaignSentAtColumn = {
        name: 'firstCampaign',
        label: 'Temps d\'envoi de la première campagne après inscription',
        render: ({ firstCampaignSentAt, firstActivatedAt }: EstablishmentData) => <>
            { firstActivatedAt && firstCampaignSentAt && <>
                {differenceInDays(firstCampaignSentAt, firstActivatedAt)} jours
            </> }
        </>
    };

    const housingWithStatusCount = (status: HousingStatus, subStatus?: string) => {
        return housingByStatus?.filter(_ => _.status === status)
            .filter(_ => subStatus ? _.subStatus === subStatus : true)
            .reduce((count, h) => Number(h.count) + count, 0)
    }

    const housingWithStatusNoPrecisionsCount = (status: HousingStatus) => {
        return housingByStatus?.filter(_ => _.status === status)
            .filter(_ => !_.precisions?.length)
            .reduce((count, h) => Number(h.count) + count, 0)
    }

    const columns = () => [
        establishmentColumn,
        housingCountColumn,
        firstActivationColumn,
        lastAuthenticationColumn,
        lastMonthUpdatesCountColumn,
        campaignsCountColumn,
        contactedHousingCountColumn,
        contactedHousingPerCampaignColumn,
        lastCampaignSentAtColumn,
        delayBetweenCampaignsColumn,
        firstCampaignSentAtColumn
    ]

    return (

        <>
            <div className="bg-100">
                <Container spacing="pb-1w">
                    <AppBreadcrumb />
                    <Row>
                        <Col>
                            <Title as="h1">Suivi</Title>
                        </Col>
                    </Row>
                </Container>
            </div>
            <Container spacing="pt-2w">
                <ul>
                    <li>
                        <b>En attente de retour</b> :&nbsp;
                        {housingByStatus ? housingWithStatusCount(HousingStatus.Waiting) : '...'}
                    </li>
                    <li>
                        <b>Suivi en cours</b> :&nbsp;
                        {housingByStatus ? housingWithStatusCount(HousingStatus.InProgress) : '...'}
                        <ul>
                            <li>
                                <b>{InProgressWithSupportSubStatus}</b> :&nbsp;
                                {housingByStatus ? housingWithStatusCount(HousingStatus.InProgress, InProgressWithSupportSubStatus) : '...'}
                            </li>
                            <li>
                                <b>{InProgressWithPublicSupportSubStatus}</b> :&nbsp;
                                {housingByStatus ? housingWithStatusCount(HousingStatus.InProgress, InProgressWithPublicSupportSubStatus) : '...'}
                            </li>
                            <li>
                                <b>{InProgressWithoutSupportSubStatus}</b> :&nbsp;
                                {housingByStatus ? housingWithStatusCount(HousingStatus.InProgress, InProgressWithoutSupportSubStatus) : '...'}
                            </li>
                            <li>
                                <b>Sans précisions</b> :&nbsp;
                                {housingByStatus ? housingWithStatusNoPrecisionsCount(HousingStatus.InProgress) : '...'}
                            </li>
                        </ul>
                    </li>
                    <li>
                        <b>Sortie de la vacance</b> :&nbsp;
                        {housingByStatus ? housingWithStatusCount(HousingStatus.Exit) : '...'}
                        <ul>
                            <li>
                                <b>{ExitWithSupportSubStatus}</b> :&nbsp;
                                {housingByStatus ? housingWithStatusCount(HousingStatus.Exit, ExitWithSupportSubStatus) : '...'}
                            </li>
                            <li>
                                <b>{ExitWithPublicSupportSubStatus}</b> :&nbsp;
                                {housingByStatus ? housingWithStatusCount(HousingStatus.Exit, ExitWithPublicSupportSubStatus) : '...'}
                            </li>
                            <li>
                                <b>{ExitWithoutSupportSubStatus}</b> :&nbsp;
                                {housingByStatus ? housingWithStatusCount(HousingStatus.Exit, ExitWithoutSupportSubStatus) : '...'}
                            </li>
                            <li>
                                <b>Sans précisions</b> :&nbsp;
                                {housingByStatus ? housingWithStatusNoPrecisionsCount(HousingStatus.Exit) : '...'}
                            </li>
                        </ul>
                    </li>
                </ul>
                {establishmentData &&
                    <Table
                        caption="Collectivités"
                        captionPosition="none"
                        rowKey="id"
                        data={establishmentData}
                        columns={columns()}
                        fixedLayout={false}
                    />
                }
            </Container>
        </>
    )
}

export default MonitoringView;
