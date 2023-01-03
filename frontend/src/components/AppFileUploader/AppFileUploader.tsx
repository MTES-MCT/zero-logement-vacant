import { Button } from '@dataesr/react-dsfr';

const FileExtension = '.shp';

const AppUploadField = ({
  setName,
  setFile,
}: {
  setName: (name: string) => void;
  setFile: (file?: File) => void;
}) => {
  return (
    <div>
      <input
        type="file"
        id="fileInput"
        multiple={false}
        accept={FileExtension}
        onChange={(event) => {
          setName(event.target.files ? event.target.files[0].name : '');
          setFile(event.target.files ? event.target.files[0] : undefined);
        }}
      />
      <Button>Importer</Button>
    </div>
  );
};

export default AppUploadField;
