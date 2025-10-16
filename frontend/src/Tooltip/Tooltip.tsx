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
    if (!element) {
      return;
    }

    function placeTooltip(event: Event): void {
      // @ts-expect-error dsfr is not typed on window
      const tooltip = window.dsfr(event.target).tooltip;
      tooltip.mode =
        !!props.align || !!props.place ? 'placement_manual' : 'placement_auto';
      tooltip.align = props.align ? `align_${props.align}` : undefined;
      tooltip.place = props.place ? `place_${props.place}` : undefined;
    }

    element.parentElement?.addEventListener('dsfr.show', placeTooltip, {
      once: true
    });

    return () => {
      element.parentElement?.removeEventListener('dsfr.show', placeTooltip);
    };
  }, [props.align, props.place]);

  return <DSFRTooltip {...props} ref={ref} id={id} />;
}

export default memo(Tooltip);
