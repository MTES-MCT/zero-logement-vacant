import { fr } from '@codegouvfr/react-dsfr';
import styled from '@emotion/styled';
import classNames from 'classnames';

type Responsive = '1x1' | '2x3' | '3x2' | '3x4' | '4x3' | '16x9' | '32x9';

interface Props {
  alt: string;
  className?: string;
  responsive?: boolean | Responsive | 'max-width';
  src: string;
}

function Image(props: Readonly<Props>) {
  const { className, responsive, ...rest } = props;

  return (
    <img
      className={classNames(
        {
          [fr.cx('fr-responsive-img')]:
            responsive === true ||
            (typeof responsive === 'string' && responsive !== 'max-width'),
          [fr.cx('fr-responsive-img--1x1')]: responsive === '1x1',
          [fr.cx('fr-responsive-img--2x3')]: responsive === '2x3',
          [fr.cx('fr-responsive-img--3x2')]: responsive === '3x2',
          [fr.cx('fr-responsive-img--3x4')]: responsive === '3x4',
          [fr.cx('fr-responsive-img--4x3')]: responsive === '4x3',
          [fr.cx('fr-responsive-img--16x9')]: responsive === '16x9',
          [fr.cx('fr-responsive-img--32x9')]: responsive === '32x9'
        },
        className
      )}
      {...rest}
    />
  );
}

export default styled(Image)`
  max-width: ${(props) => (props.responsive === 'max-width' ? '100%' : 'none')};
  height: auto;
`;
