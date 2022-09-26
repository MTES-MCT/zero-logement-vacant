import React, { useEffect, useState } from 'react';

import { Col, Container, File, Link, Row, Tab, Table, Tabs, Text, Title } from '@dataesr/react-dsfr';
import AppBreadcrumb from '../../components/AppBreadcrumb/AppBreadcrumb';
import { deleteGeoPerimeter, fetchGeoPerimeters, updateGeoPerimeter, uploadFile } from '../../store/actions/geoAction';
import { useDispatch, useSelector } from 'react-redux';
import { ApplicationState } from '../../store/reducers/applicationReducers';
import { displayCount } from '../../utils/stringUtils';
import { GeoPerimeter } from '../../models/GeoPerimeter';
import AppActionsMenu, { MenuAction } from '../../components/AppActionsMenu/AppActionsMenu';
import ConfirmationModal from '../../components/modals/ConfirmationModal/ConfirmationModal';
import GeoPerimeterEditionModal from '../../components/modals/GeoPerimeterEditionModal/GeoPerimeterEditionModal';

const GeoPerimeterView = () => {

    const dispatch = useDispatch();

    const { geoPerimeters, loading } = useSelector((state: ApplicationState) => state.geo);
    const [ updatingModalGeoPerimeterId, setUpdatingModalGeoPerimeterId ] = useState<string | undefined>();
    const [ removingModalGeoPerimeterId, setRemovingModalGeoPerimeterId ] = useState<string | undefined>();

    useEffect(() => {
        dispatch(fetchGeoPerimeters())
    }, [dispatch])

    const FileExtension = '.jpg';

    const selectFile = (event: any) => {
        //TODO erreurs
        if (event.target?.files) {
            dispatch(uploadFile(event.target.files[0]))

        } else {
            console.log('no files')
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

    const columns = [nameColumn, typeColumn, actionsColumn, viewColumn]

    return (
        <>
            <div className="bg-100">
                <Container spacing="pb-1w">
                    <AppBreadcrumb />
                    <Row>
                        <Col n="8">
                            <Title as="h1">Périmètres</Title>
                        </Col>
                    </Row>
                </Container>
            </div>
            <Container spacing="py-4w">
                <Tabs>
                    <Tab label="Liste">
                        {!loading &&
                            <>
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
                    </Tab>
                    <Tab label="Dépôt">

                        <Row>
                            <File onChange={(event: any)=> selectFile(event)} multiple={false} accept={FileExtension}
                                  label="Label File"
                                  hint="Hint"
                                  errorMessage="Format de fichier non supporté" />
                        </Row>
                    </Tab>
                </Tabs>
            </Container>
        </>
    );
};

export default GeoPerimeterView;
