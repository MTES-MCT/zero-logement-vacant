import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ApplicationState } from '../../store/reducers/applicationReducers';
import { Col, Container, Row, Text, Title } from '@dataesr/react-dsfr';
import AppBreadcrumb from '../../components/AppBreadcrumb/AppBreadcrumb';
import { fetchEstablishmentData, fetchHousingToContact } from '../../store/actions/monitoringAction';
import { EstablishmentData } from '../../models/Establishment';
import { differenceInDays, format, formatDuration } from 'date-fns';
import { fr } from 'date-fns/locale';
import { percent } from '../../utils/numberUtils';
import { useParams } from 'react-router-dom';
import { displayCount } from '../../utils/stringUtils';
import HousingList, { HousingDisplayKey } from '../../components/HousingList/HousingList';
import { Housing } from '../../models/Housing';

const MonitoringView = () => {

    const dispatch = useDispatch();

    const { establishmentId } = useParams<{establishmentId: string}>();

    const { establishmentData, paginatedHousingToContact, paginatedHousingToContactFilters } = useSelector((state: ApplicationState) => state.monitoring);
    const [ establishmentDetailData, setEstablishmentDetailData] = useState<EstablishmentData>()


    useEffect(() => {
        if (!establishmentData) {
            dispatch(fetchEstablishmentData({ establishmentIds: [establishmentId] }))
        }
        if (paginatedHousingToContactFilters.establishmentIds?.indexOf(establishmentId) === -1) {
            dispatch(fetchHousingToContact({ establishmentIds: [establishmentId] }))
        }
    }, [dispatch, establishmentData, establishmentId]) //eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (establishmentData) {
            setEstablishmentDetailData(establishmentData.find(_ => _.id === establishmentId))
        }
    }, [establishmentId, establishmentData])

    const lastContactColumn = {
        name: 'lastContact',
        label: 'Dernier contact',
        render: ({ lastContact } : Housing) =>
            lastContact && <>
                {format(lastContact, 'dd/MM/yyyy')}
                <br />
                ({differenceInDays(new Date(), lastContact) ? 'il y a ' + displayCount(differenceInDays(new Date(), lastContact), 'jour', false) : 'aujourd\'hui'})
            </>
    };

    return (

        <>
            <div className="bg-100">
                <Container spacing="pb-1w">
                    <AppBreadcrumb />
                    <Row gutters>
                        <Col>
                            <Title as="h1">{establishmentDetailData?.name ?? ''}</Title>
                        </Col>
                    </Row>
                </Container>
            </div>
            <Container spacing="pt-2w">
                <ul>
                    <li>
                        <b>Nombre de logements vacants :&nbsp;</b>
                        {establishmentDetailData?.housingCount}
                    </li>
                    <li>
                        <b>Date de première inscription :&nbsp;</b>
                            { establishmentDetailData?.firstActivatedAt && <>
                                {format(establishmentDetailData.firstActivatedAt, 'dd/MM/yyyy')} ({differenceInDays(new Date(), establishmentDetailData?.firstActivatedAt)} jours)
                            </> }
                    </li>
                    <li>
                        <b>Date de dernière connexion :&nbsp;</b>
                            { establishmentDetailData?.lastAuthenticatedAt && <>
                                {format(establishmentDetailData?.lastAuthenticatedAt, 'dd/MM/yyyy')}
                            </> }
                    </li>
                    <li>
                        <b>Nombre de dossiers mis à jour dans les 30 derniers jours :&nbsp;</b>
                        {establishmentDetailData?.lastMonthUpdatesCount}
                    </li>
                    <li>
                        <b>Nombre de campagnes :&nbsp;</b>
                        {establishmentDetailData?.campaignsCount}
                    </li>
                    <li>
                        <b>Nombre de logements contactés :&nbsp;</b>
                        {establishmentDetailData?.contactedHousingCount} ({percent(establishmentDetailData?.contactedHousingCount, establishmentDetailData?.housingCount)}%)
                    </li>
                    <li>
                        <b>Nombre de logements contactés par campagne :&nbsp;</b>
                        {Math.floor(establishmentDetailData?.contactedHousingPerCampaign ?? 0)} ({percent(establishmentDetailData?.contactedHousingPerCampaign, establishmentDetailData?.housingCount)}%)
                    </li>
                    <li>
                        <b>Date d'envoi de la dernière campagne :&nbsp;</b>
                        {establishmentDetailData?.lastCampaignSendingDate && <>
                            {format(establishmentDetailData?.lastCampaignSendingDate, 'dd/MM/yyyy')} ({differenceInDays(new Date(), establishmentDetailData?.lastCampaignSendingDate)} jours)
                        </>}
                    </li>
                    <li>
                        <b>Temps moyen d’envoi entre 2 campagnes :&nbsp;</b>
                        {establishmentDetailData?.delayBetweenCampaigns && <>
                            {formatDuration(establishmentDetailData?.delayBetweenCampaigns, { format: ['months', 'days'], locale: fr }) }
                        </>}
                    </li>
                    <li>
                        <b>Temps d'envoi de la première campagne après inscription :&nbsp;</b>
                        { establishmentDetailData?.firstActivatedAt && establishmentDetailData?.firstCampaignSendingDate && <>
                            {differenceInDays(establishmentDetailData?.firstCampaignSendingDate, establishmentDetailData?.firstActivatedAt)} jours
                        </> }
                    </li>
                </ul>
                {paginatedHousingToContact.totalCount > 0 &&
                    <>
                        <hr />
                        <Text>
                            <b>Il y a {displayCount(paginatedHousingToContact.totalCount, 'logement', false)} dans le sous-statut "A recontacter"</b>
                        </Text>

                        <HousingList paginatedHousing={paginatedHousingToContact}
                                     onChangePagination={(page, perPage) => dispatch(fetchHousingToContact({ establishmentIds: [establishmentId] }, page, perPage))}
                                     displayKind={HousingDisplayKey.Housing}
                                     additionalColumns={[lastContactColumn]}/>
                    </>
                }
            </Container>
        </>
    )
}

export default MonitoringView;
