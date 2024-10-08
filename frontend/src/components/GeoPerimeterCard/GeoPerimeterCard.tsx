import { Col, Icon, Row, Text } from '../_dsfr';
import { GeoPerimeter } from '../../models/GeoPerimeter';
import Tag from '@codegouvfr/react-dsfr/Tag';
import Card from '@codegouvfr/react-dsfr/Card';
import AppLink from '../_app/AppLink/AppLink';
import Button from '@codegouvfr/react-dsfr/Button';
import ConfirmationModal from '../modals/ConfirmationModal/ConfirmationModal';
import Typography from '@mui/material/Typography';

interface Props {
  geoPerimeter: GeoPerimeter;
  onEdit: (geoPerimeter: GeoPerimeter) => void;
  onRemove: (geoPerimeter: GeoPerimeter) => Promise<void>;
}

function GeoPerimeterCard({ geoPerimeter, onEdit, onRemove }: Props) {
  return (
    <Card
      className="h-fit-content"
      titleAs="h2"
      title={
        <>
          <Row>
            <Col>
              <span className="card-title-icon">
                <Icon
                  name="fr-icon-france-fill"
                  iconPosition="center"
                  size="1x"
                />
              </span>
            </Col>
            <Col className="align-right">
              <Button
                title="Modifier"
                priority="tertiary no outline"
                onClick={() => onEdit(geoPerimeter)}
                iconId="fr-icon-edit-fill"
              />
              <ConfirmationModal
                modalId={geoPerimeter.id}
                onSubmit={() => onRemove(geoPerimeter)}
                openingButtonProps={{
                  iconId: 'fr-icon-delete-bin-fill',
                  priority: 'tertiary no outline',
                  title: 'Supprimer',
                  className: 'd-inline-block'
                }}
              >
                <Text size="md">
                  Êtes-vous sûr de vouloir supprimer ce périmètre ?
                </Text>
              </ConfirmationModal>
            </Col>
          </Row>
          <Typography component="h2" variant="h6" mb={0}>
            {geoPerimeter.name}
          </Typography>
        </>
      }
      desc={
        <div>
          <Tag className="fr-mb-4w">
            {geoPerimeter.kind ? geoPerimeter.kind : 'Non renseigné'}
          </Tag>
          <Row justifyContent="right">
            <AppLink
              title="Afficher (.json)"
              target="_blank"
              isSimple
              iconId="fr-icon-eye-fill"
              iconPosition="left"
              className="fr-mt-4w"
              to={
                'https://geojson.io/#data=data:application/json,' +
                encodeURIComponent(JSON.stringify(geoPerimeter.geometry))
              }
            >
              Afficher (.json)
            </AppLink>
          </Row>
        </div>
      }
    ></Card>
  );
}

export default GeoPerimeterCard;
