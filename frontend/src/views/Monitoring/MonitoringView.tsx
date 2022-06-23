import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ApplicationState } from '../../store/reducers/applicationReducers';
import { Col, Container, Row, Table, Title } from '@dataesr/react-dsfr';
import AppBreadcrumb from '../../components/AppBreadcrumb/AppBreadcrumb';
import { fetchEstablishmentData } from '../../store/actions/monitoringAction';
import { EstablishmentData } from '../../models/Establishment';
import { differenceInDays, format } from 'date-fns';


const MonitoringView = () => {

    const dispatch = useDispatch();
    const { establishmentData } = useSelector((state: ApplicationState) => state.monitoring);


    useEffect(() => {
        dispatch(fetchEstablishmentData())
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

    const lastCampaignSentAtColumn = {
        name: 'lastCampaign',
        label: 'Date d\'envoi de la dernière campagne',
        render: ({ lastCampaignSentAt }: EstablishmentData) => <>
            { lastCampaignSentAt && <>
                {format(lastCampaignSentAt, 'dd/MM/yyyy')} <br />({differenceInDays(new Date(), lastCampaignSentAt)} jours)
            </> }
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

    const columns = () => [
        establishmentColumn,
        housingCountColumn,
        firstActivationColumn,
        lastAuthenticationColumn,
        lastMonthUpdatesCountColumn,
        campaignsCountColumn,
        contactedHousingCountColumn,
        lastCampaignSentAtColumn,
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
