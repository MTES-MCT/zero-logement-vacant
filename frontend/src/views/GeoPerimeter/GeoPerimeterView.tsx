import React, { useEffect, useRef, useState } from 'react';

import { Alert, Badge, Col, Container, File, Link, Row, Tab, Table, Tabs, Text, Title } from '@dataesr/react-dsfr';
import AppBreadcrumb from '../../components/AppBreadcrumb/AppBreadcrumb';
import { deleteGeoPerimeter, fetchGeoPerimeters, updateGeoPerimeter, uploadFile } from '../../store/actions/geoAction';
import { useDispatch, useSelector } from 'react-redux';
import { ApplicationState } from '../../store/reducers/applicationReducers';
import { displayCount } from '../../utils/stringUtils';
import { GeoPerimeter } from '../../models/GeoPerimeter';
import AppActionsMenu, { MenuAction } from '../../components/AppActionsMenu/AppActionsMenu';
import ConfirmationModal from '../../components/modals/ConfirmationModal/ConfirmationModal';
import GeoPerimeterEditionModal from '../../components/modals/GeoPerimeterEditionModal/GeoPerimeterEditionModal';
import { useGeoPerimeterList } from '../../hooks/useGeoPerimeterList';

const GeoPerimeterView = () => {

    const dispatch = useDispatch();
    const geoPerimeters = useGeoPerimeterList();

    const FileType = 'application/zip';

    const { loading } = useSelector((state: ApplicationState) => state.geo);
    const [ updatingModalGeoPerimeterId, setUpdatingModalGeoPerimeterId ] = useState<string | undefined>();
    const [ removingModalGeoPerimeterId, setRemovingModalGeoPerimeterId ] = useState<string | undefined>();
    const [ fileError, setFileError ] = useState<string | undefined>();

    const tabsRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        dispatch(fetchGeoPerimeters())
    }, [dispatch])

    const selectFile = (event: any) => {

        if (event.target?.files[0]) {

            const file = event.target?.files[0]

            if (file.type === FileType) {
                setFileError(undefined)
                dispatch(uploadFile(event.target.files[0]))

                const firstTabButton = tabsRef.current?.querySelector('button.fr-tabs__tab')
                if (firstTabButton) {
                    firstTabButton.dispatchEvent(new MouseEvent('click', {
                        view: window,
                        bubbles: true,
                        cancelable: true,
                        buttons: 1
                    }));
                }
            } else {
                setFileError(`Seuls les fichier zip sont autorisés`)
            }

        } else {
            setFileError('Aucun fichier sélectionné')
        }
    }

    const onSubmitUpdatingGeoPerimeter = (type: string, name?: string) => {
        if (updatingModalGeoPerimeterId) {
            dispatch(updateGeoPerimeter(updatingModalGeoPerimeterId, type, name))
        }
        setUpdatingModalGeoPerimeterId(undefined);
    }

    const onSubmitRemovingGeoPerimeter = () => {
        if (removingModalGeoPerimeterId) {
            dispatch(deleteGeoPerimeter(removingModalGeoPerimeterId))
        }
        setRemovingModalGeoPerimeterId(undefined);
    }

    const typeColumn = {
        name: 'type',
        label: 'Type',
        render: ({ type }: GeoPerimeter) =>
            <>
                {type ?
                    type :
                    <Badge small
                           text='Non renseigné'
                           colorFamily='pink-tuile'
                    />
                }
            </>,
        sortable: true
    };

    const nameColumn = {
        name: 'name',
        label: 'Nom',
        sortable: true
    };

    const actionsColumn = {
        name: 'actions',
        headerRender: () => '',
        render: (geoPerimeter: GeoPerimeter) =>
            <>
                <AppActionsMenu actions={[
                    { title: 'Modifier', onClick: () => {setUpdatingModalGeoPerimeterId(geoPerimeter.id)} },
                    { title: 'Supprimer', onClick: () => setRemovingModalGeoPerimeterId(geoPerimeter.id) }
                ] as MenuAction[]}/>

                {updatingModalGeoPerimeterId === geoPerimeter.id &&
                    <GeoPerimeterEditionModal
                        geoPerimeter={geoPerimeter}
                        onSubmit={onSubmitUpdatingGeoPerimeter}
                        onClose={() => setUpdatingModalGeoPerimeterId(undefined)} />
                }
                {removingModalGeoPerimeterId === geoPerimeter.id &&
                    <ConfirmationModal
                        onSubmit={onSubmitRemovingGeoPerimeter}
                        onClose={() => setRemovingModalGeoPerimeterId(undefined)}>
                        <Text size="md">
                            Êtes-vous sûr de vouloir supprimer ce périmètre ?
                        </Text>
                    </ConfirmationModal>
                }
            </>
    }

    const viewColumn = {
        name: 'view',
        headerRender: () => '',
        render: ({ geoJson }: GeoPerimeter) =>
            <Link title="Afficher"
                  target="_blank"
                  href={'https://geojson.io/#data=data:application/json,' + encodeURIComponent(JSON.stringify(geoJson))} className="ds-fr--inline fr-link">
                Afficher<span className="ri-1x icon-right ri-arrow-right-line ds-fr--v-middle" />
            </Link>
    }

    const columns = [typeColumn, nameColumn, actionsColumn, viewColumn]

    const invalidGeoFilters = geoPerimeters?.filter(_ => !_.type?.length)

    return (
        <>
            <div className="bg-100">
                <Container spacing="pb-1w">
                    <AppBreadcrumb />
                    <Row>
                        <Col n="8">
                            <Title as="h1">Périmètres géographiques</Title>
                        </Col>
                    </Row>
                </Container>
            </div>
            <Container spacing="py-4w">
                <div ref={tabsRef}>
                    <Tabs>
                        <Tab label="Liste des périmètres">
                            <>
                                {!loading && geoPerimeters &&
                                    <>
                                        {invalidGeoFilters && invalidGeoFilters.length > 0 &&
                                            <Alert description={`Il y a ${displayCount(invalidGeoFilters.length, 'périmètre')} qui ne sont pas valides car le type n'est pas renseigné`}
                                                   type="warning"
                                                   className="fr-mb-2w"/>
                                        }
                                        <Row>
                                            <b>{displayCount(geoPerimeters.length, 'périmètre')}</b>
                                        </Row>
                                        {geoPerimeters.length > 0 &&
                                            <Row>
                                                <Table
                                                    caption="Périmètres"
                                                    captionPosition="none"
                                                    rowKey="id"
                                                    data={geoPerimeters}
                                                    columns={columns}
                                                    fixedLayout={true}
                                                    className='with-view with-actions'
                                                />
                                            </Row>
                                        }
                                    </>
                                }
                            </>
                        </Tab>
                        <Tab label="Dépôt de fichier">

                            <Row>
                                <File onChange={(event: any)=> selectFile(event)} multiple={false}
                                      label="Périmètre(s) géométrique(s)"
                                      hint="Sélectionner un fichier zip uniquement qui contient un ou plusieurs périmètres"
                                      errorMessage={fileError} />
                            </Row>
                        </Tab>
                    </Tabs>
                </div>
            </Container>
        </>
    );
};

export default GeoPerimeterView;
