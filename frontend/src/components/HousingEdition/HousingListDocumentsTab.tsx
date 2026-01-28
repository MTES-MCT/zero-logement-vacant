import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import { Array, pipe } from 'effect';
import { useController } from 'react-hook-form';
import { match, Pattern } from 'ts-pattern';

import FileCard from '~/components/HousingDetails/FileCard';
import HousingListDocumentUpload from '~/components/HousingEdition/HousingListDocumentUpload';

function HousingListDocumentsTab() {
  const { field } = useController<{ files: ReadonlyArray<File> | null }>({
    name: 'files'
  });
  const value: ReadonlyArray<File> = match(field.value)
    .with(null, () => Array.empty<File>())
    .with(Pattern.array({ name: Pattern.string }), (files) => files)
    .with({ name: Pattern.string }, (file) => [file])
    .exhaustive();

  function onUpload(files: ReadonlyArray<File>): void {
    const values: ReadonlyArray<File> = pipe(
      value,
      Array.unionWith(files, (a, b) => a.name === b.name)
    );
    field.onChange(values);
  }

  function onRemove(file: File): void {
    field.onChange(value.filter(({ name }) => name !== file.name));
  }

  return (
    <Stack spacing="1.5rem" useFlexGap>
      <HousingListDocumentUpload onUpload={onUpload} />

      <Grid container spacing="1.5rem">
        {value.map((file) => (
          <Grid key={file.name} size={4}>
            <FileCard
              contentType={file.type}
              filename={file.name}
              size={file.size}
              url={URL.createObjectURL(file)}
              onRemove={() => {
                onRemove(file);
              }}
            />
          </Grid>
        ))}
      </Grid>
    </Stack>
  );
}

export default HousingListDocumentsTab;
