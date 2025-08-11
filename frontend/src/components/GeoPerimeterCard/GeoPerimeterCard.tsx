import Button from '@codegouvfr/react-dsfr/Button';
import Card from '@codegouvfr/react-dsfr/Card';
import Tag from '@codegouvfr/react-dsfr/Tag';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';

import { GeoPerimeter } from '../../models/GeoPerimeter';
import AppLink from '../_app/AppLink/AppLink';
import { Icon, Row } from '../_dsfr';

interface Props {
  geoPerimeter: GeoPerimeter;
  onEdit(geoPerimeter: GeoPerimeter): void;
  onRemove(geoPerimeter: GeoPerimeter): void;
}

function GeoPerimeterCard({ geoPerimeter, onEdit, onRemove }: Props) {
  return (
    <Card
      className="h-fit-content"
      titleAs="h2"
      title={
        <>
          <Grid
            container
            spacing={2}
            size={12}
            sx={{ justifyContent: 'space-between' }}
          >
            <Grid size={4}>
              <span className="card-title-icon">
                <Icon
                  name="fr-icon-france-fill"
                  iconPosition="center"
                  size="1x"
                />
              </span>
            </Grid>
            <Grid>
              <Button
                title="Modifier"
                priority="tertiary no outline"
                onClick={() => onEdit(geoPerimeter)}
                iconId="fr-icon-edit-fill"
              />
              <Button
                title="Supprimer"
                iconId="fr-icon-delete-bin-fill"
                priority="tertiary no outline"
                onClick={() => onRemove(geoPerimeter)}
              ></Button>
            </Grid>
          </Grid>
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
