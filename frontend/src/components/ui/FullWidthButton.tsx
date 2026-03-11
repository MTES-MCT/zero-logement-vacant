import { Button, type ButtonProps } from '@codegouvfr/react-dsfr/Button';
import { styled } from '@mui/material/styles';

const FullWidthButton = styled(Button)<ButtonProps>({
  justifyContent: 'center',
  width: '100% !important'
});

export default FullWidthButton;
