import { fr } from '@codegouvfr/react-dsfr';
import { createMuiDsfrThemeProvider } from '@codegouvfr/react-dsfr/mui';
import { StyledEngineProvider, Theme } from '@mui/material/styles';
import { defaultsDeep } from 'lodash-es';
import { PropsWithChildren } from 'react';
import { DeepPartial } from 'ts-essentials';

const { MuiDsfrThemeProvider } = createMuiDsfrThemeProvider({
  augmentMuiTheme({ nonAugmentedMuiTheme }): Theme {
    return defaultsDeep(nonAugmentedMuiTheme, {
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
        },
        MuiAutocomplete: {
          styleOverrides: {
            listbox: {
              padding: 0
            },
            option: {
              padding: `0.25rem ${fr.spacing('2w')}`,
              '&.Mui-focused': {
                backgroundColor: `${fr.colors.decisions.background.default.grey.hover} !important`
              },
              '&.Mui-focusVisible': {
                backgroundColor: `${fr.colors.decisions.background.default.grey.hover} !important`
              },
              '&[aria-selected="true"]': {
                backgroundColor: `${fr.colors.decisions.background.open.blueFrance.default} !important`
              },
              '&[aria-selected="true"]:hover': {
                backgroundColor: `${fr.colors.decisions.background.open.blueFrance.hover} !important`
              },
              '&[aria-selected="true"].Mui-focused': {
                backgroundColor: `${fr.colors.decisions.background.open.blueFrance.hover} !important`
              },
              '&[aria-selected="true"].Mui-focusVisible': {
                backgroundColor: `${fr.colors.decisions.background.open.blueFrance.hover} !important`
              }
            }
          }
        },
        MuiMenuItem: {
          styleOverrides: {
            root: {
              '&.Mui-focused': {
                backgroundColor:
                  fr.colors.decisions.background.default.grey.hover
              },
              '&.Mui-focusVisible': {
                backgroundColor:
                  fr.colors.decisions.background.default.grey.hover
              },
              '&.Mui-selected': {
                backgroundColor: `${fr.colors.decisions.background.open.blueFrance.default}`
              },
              '&.Mui-selected.Mui-focusVisible': {
                backgroundColor: `${fr.colors.decisions.background.open.blueFrance.hover}`
              },
              '&.Mui-selected:hover': {
                backgroundColor: `${fr.colors.decisions.background.open.blueFrance.hover}`
              }
            },
            dense: {
              paddingTop: '2px',
              paddingBottom: '2px'
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
