import { match } from 'ts-pattern';
import AppSelectNext from '../_app/AppSelect/AppSelectNext';
import type { AppSelectNextProps } from '../_app/AppSelect/AppSelectNext';

export type TaxSelectProps<Multiple extends boolean> = Pick<
  AppSelectNextProps<boolean, Multiple>,
  'className' | 'disabled' | 'error' | 'multiple' | 'value' | 'onChange'
>;

function TaxSelect<Multiple extends boolean = false>(
  props: TaxSelectProps<Multiple>
) {
  function getLabel(option: boolean): string {
    return match(option)
      .with(true, () => 'Oui')
      .with(false, () => 'Non')
      .exhaustive();
  }

  return (
    <AppSelectNext
      {...props}
      options={[true, false]}
      label="Taxe sur la vacance"
      getOptionLabel={getLabel}
    />
  );
}

export default TaxSelect;
