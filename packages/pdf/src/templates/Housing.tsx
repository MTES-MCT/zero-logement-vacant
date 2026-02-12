// packages/pdf/src/templates/Housing.tsx
import React from 'react';
import { Page, View, StyleSheet } from '@react-pdf/renderer';
import { Typography, Stack } from '../components';
import type { HousingDTO } from '@zerologementvacant/models';

interface HousingTemplateProps {
  housing: HousingDTO;
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    backgroundColor: '#ffffff'
  }
});

export function HousingTemplate({ housing }: HousingTemplateProps) {
  return (
    <Page size="A4" style={styles.page}>
      <Stack direction="column" spacing={8}>
        <Typography variant="h1">Fiche Logement</Typography>

        {/* Address section */}
        <View>
          <Typography variant="h3">Adresse</Typography>
          {housing.rawAddress.map((line, index) => (
            <Typography key={index} variant="body">
              {line}
            </Typography>
          ))}
        </View>

        {/* Housing details */}
        <View>
          <Typography variant="h3">Caractéristiques</Typography>
          <Stack direction="row" spacing={16}>
            <Typography variant="body">
              Surface: {housing.livingArea ?? 'N/A'} m²
            </Typography>
            <Typography variant="body">
              Pièces: {housing.roomsCount ?? 'N/A'}
            </Typography>
          </Stack>
        </View>

        {/* Owner section */}
        {housing.owner && (
          <View>
            <Typography variant="h3">Propriétaire</Typography>
            <Typography variant="body">{housing.owner.fullName}</Typography>
          </View>
        )}
      </Stack>
    </Page>
  );
}
