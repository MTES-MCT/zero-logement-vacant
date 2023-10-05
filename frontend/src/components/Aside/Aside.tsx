import { Title } from '../../components/dsfr/index';
import { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import classNames from 'classnames';
import styles from './aside.module.scss';
import Button from '@codegouvfr/react-dsfr/Button';

export interface AsideProps {
  title: ReactNode;
  content: ReactNode | ReactNode[];
  footer: ReactNode | ReactNode[];
  expand?: boolean;
  onClose?: () => void;
  attachTo?: Element;
  className?: string;
}

function Aside(props: AsideProps) {
  const expand = props.expand ?? false;
  const component = (
    <aside
      className={classNames(styles.aside, {
        [styles.collapsed]: !expand,
      })}
    >
      <article className={classNames(styles.article, props.className)}>
        <header>
          {props.title && typeof props.title === 'string' ? (
            <>
              <Button
                title="Fermer"
                className="fr-p-0"
                iconId="fr-icon-arrow-right-s-line-double"
                priority="tertiary no outline"
                onClick={props.onClose}
              />
              <Title as="h6">{props.title}</Title>
            </>
          ) : (
            props.title
          )}
        </header>
        <main className={styles.main}>{props.content}</main>
        <footer>{props.footer}</footer>
      </article>
    </aside>
  );

  const root = props.attachTo ?? document.getElementById('root');
  if (!root) {
    // Should never happen
    throw new Error('root element not found');
  }
  return createPortal(component, root);
}

export default Aside;
