import { fr, FrIconClassName, RiIconClassName } from '@codegouvfr/react-dsfr';
import Button, { ButtonProps } from '@codegouvfr/react-dsfr/Button';

interface Props extends ButtonProps.Common, ButtonProps.IconOnly {
  iconId: FrIconClassName | RiIconClassName;
  isActive?: boolean;
  title: string;
  onClick?(): void;
}

function IconToggle(props: Props) {
  const active = props.isActive;

  function onClick(): void {
    props.onClick?.();
  }

  return (
    <Button
      iconId={props.iconId}
      priority={active ? 'primary' : 'tertiary no outline'}
      style={{
        color: active
          ? undefined
          : fr.colors.decisions.text.default.grey.default,
      }}
      size={props.size}
      title={props.title}
      type="button"
      onClick={onClick}
    />
  );
}

export default IconToggle;
