import { createMuiDsfrThemeProvider } from '@codegouvfr/react-dsfr/mui';
import { StyledEngineProvider, Theme } from '@mui/material/styles';
import { PropsWithChildren } from 'react';
import fp from 'lodash/fp';
import { DeepPartial } from 'ts-essentials';

const { MuiDsfrThemeProvider } = createMuiDsfrThemeProvider({
  augmentMuiTheme({ nonAugmentedMuiTheme }): Theme {
    return fp.defaultsDeep(nonAugmentedMuiTheme, {
      zIndex: {
        // Found in @codegouvfr/react-dsfr
        drawer: 500,
        appBar: 750,
        modal: 1750
      },
      typography: {
        subtitle1: {
          fontSize: '1.25rem',
          fontWeight: 700
        },
        subtitle2: {
          fontSize: '1.125rem',
          fontWeight: 400,
          lineHeight: '1.75rem'
        }
      },
      components: {
        // Customize @mui/material components globally here
        MuiTypography: {
          defaultProps: {
            variantMapping: {
              subtitle1: 'p',
              subtitle2: 'p'
            }
          }
        }
      }
    } satisfies DeepPartial<Theme>);
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
