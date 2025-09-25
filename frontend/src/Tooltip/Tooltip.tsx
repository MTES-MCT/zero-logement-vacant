import DSFRTooltip, {
  type TooltipProps as DSFRTooltipProps
} from '@codegouvfr/react-dsfr/Tooltip';
import { memo, useEffect, useId, useRef } from 'react';

/**
 * If defined, the tooltip will be positioned manually according to the `align` and `place` props.
 */
type ManualPlacement = {
  /**
   * If defined, the tooltip will be positioned manually.
   */
  align?: 'start' | 'center' | 'end';
  /**
   * If defined, the tooltip will be positioned manually.
   */
  place?: 'top' | 'right' | 'bottom' | 'left';
};

export type TooltipProps = DSFRTooltipProps & ManualPlacement;

function Tooltip(props: TooltipProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const id = useId();

  useEffect(() => {
    const element = ref.current;
    if (!element || !!props.align || !!props.place) {
      return;
    }

    function placeTooltip(placement: ManualPlacement) {
      return (event: Event): void => {
        // @ts-expect-error dsfr is not typed on window
        const tooltip = window.dsfr(event.target).tooltip;
        tooltip.mode = 'placement_manual';
        tooltip.align = props.align ? `align_${placement.align}` : undefined;
        tooltip.place = props.place ? `place_${placement.place}` : undefined;
      };
    }

    const modify = placeTooltip({
      align: props.align,
      place: props.place
    });

    element.addEventListener('dsfr.show', modify, {
      once: true
    });

    return () => {
      element?.removeEventListener('dsfr.show', modify);
    };
  }, [ref.current, props.align, props.place]);

  return <DSFRTooltip {...props} ref={ref} id={id} />;
}

export default memo(Tooltip);
