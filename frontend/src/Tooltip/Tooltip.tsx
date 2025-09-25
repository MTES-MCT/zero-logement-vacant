import DSFRTooltip, {
  type TooltipProps as DSFRTooltipProps
} from '@codegouvfr/react-dsfr/Tooltip';
import { memo, useEffect, useId, useRef } from 'react';
import { match } from 'ts-pattern';

type AutoPlacement = {
  mode?: 'auto';
};

type ManualPlacement = {
  mode: 'manual';
  align: 'start' | 'center' | 'end';
  place: 'top' | 'right' | 'bottom' | 'left';
};

type Placement = AutoPlacement | ManualPlacement;

export type TooltipProps = DSFRTooltipProps & Placement;

function Tooltip(props: TooltipProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const id = useId();

  // Map to the DSFR placement props
  const placement = match(props)
    .with({ mode: 'manual' }, ({ align, place }) => ({
      mode: 'placement_manual' as const,
      align: `align_${align}` as const,
      place: `place_${place}` as const
    }))
    .otherwise(() => ({
      mode: 'placement_auto' as const
    }));

  useEffect(() => {
    if (!ref.current || placement.mode !== 'placement_manual') {
      return;
    }

    function modifyTooltip(event: Event): void {
      // @ts-expect-error dsfr is not typed on window
      const tooltip = window.dsfr(event.target).tooltip;
      tooltip.mode = 'placement_manual';
      tooltip.align = placement.align;
      tooltip.place = placement.place;
    }

    ref.current.addEventListener('dsfr.show', modifyTooltip, { once: true });

    return () => {
      ref.current?.removeEventListener('dsfr.show', modifyTooltip);
    };
  }, [ref.current]);

  return <DSFRTooltip {...props} ref={ref} id={id} />;
}

export default memo(Tooltip);
