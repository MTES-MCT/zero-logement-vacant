import { createMuiDsfrThemeProvider } from '@codegouvfr/react-dsfr/mui';
import { StyledEngineProvider, Theme } from '@mui/material/styles';
import { PropsWithChildren } from 'react';

const { MuiDsfrThemeProvider } = createMuiDsfrThemeProvider({
  augmentMuiTheme({ nonAugmentedMuiTheme }): Theme {
    return {
      ...nonAugmentedMuiTheme,
      components: {
        // Customize @mui/material components globally here
      }
    };
  }
});

function ThemeProvider(props: PropsWithChildren) {
  return (
    // Injects @mui/material styles before @codegouvfr/react-dsfr styles
    // so that we can customize it
    // See https://mui.com/material-ui/integrations/interoperability/#css-injection-order
    <StyledEngineProvider injectFirst>
      <MuiDsfrThemeProvider>{props.children}</MuiDsfrThemeProvider>
    </StyledEngineProvider>
  );
}

export default ThemeProvider;
