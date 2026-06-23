// Global JSX augmentation for the web components registered by
// @gouvfr/dsfr-chart v2: <line-chart>, <bar-chart>, <pie-chart>.
//
// Attribute API mirrors the upstream README:
//   https://github.com/GouvernementFR/dsfr-chart/blob/main/README.md
//
// Web-component attributes are stringly-typed at the DOM level. Array-valued
// attributes (`x`, `y`, `name`, `highlight-index`) must be JSON.stringify'd at
// the call site. Per the docs, `x` and `y` are arrays-of-arrays even for a
// single series; `name` is a flat array of series labels.
//
// This file is in MODULE MODE (has `export {}`) so `declare global { namespace JSX }`
// merges with the React-augmented global JSX namespace.

declare global {
  namespace JSX {
    type DsfrChartPalette =
      | 'default'
      | 'neutral'
      | 'categorical'
      | 'sequentialAscending'
      | 'sequentialDescending'
      | 'divergentAscending'
      | 'divergentDescending';

    type DsfrChartStringifiedBoolean = 'true' | 'false';

    interface DsfrChartCommonAttributes {
      /** JSON-stringified array of arrays (e.g. '[["2024-01","2024-02"]]'). */
      x?: string;
      /** JSON-stringified array of arrays (e.g. '[[120,145]]'). */
      y?: string;
      /** JSON-stringified flat array of series labels (e.g. '["Sales"]'). */
      name?: string;
      /** Unit shown in the hover tooltip (e.g. '%', '€'). */
      'unit-tooltip'?: string;
      /** Date label associated with the chart. */
      date?: string;
      /** Width-to-height ratio (string number, default '2'). */
      'aspect-ratio'?: string;
      'x-min'?: string;
      'x-max'?: string;
      'y-min'?: string;
      'y-max'?: string;
      'selected-palette'?: DsfrChartPalette;
    }

    interface IntrinsicElements {
      'line-chart': DsfrChartCommonAttributes;
      'bar-chart': DsfrChartCommonAttributes & {
        horizontal?: DsfrChartStringifiedBoolean;
        stacked?: DsfrChartStringifiedBoolean;
        /** Fixed bar width in pixels. */
        'bar-size'?: string;
        /** Maximum bar width in pixels (default 32). */
        'max-bar-size'?: string;
        /** JSON-stringified array of indices to highlight (use with palette 'neutral'). */
        'highlight-index'?: string;
      };
      'pie-chart': DsfrChartCommonAttributes & {
        /** 'true' renders a filled disc; default is a donut. */
        fill?: DsfrChartStringifiedBoolean;
      };
    }
  }
}

export {};
