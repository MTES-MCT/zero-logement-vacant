import { Button, Title } from '@dataesr/react-dsfr';
import { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import classNames from 'classnames';
import styles from './aside.module.scss';

export interface AsideProps {
  title: ReactNode;
  content: ReactNode | ReactNode[];
  footer: ReactNode | ReactNode[];
  expand?: boolean;
  onClose?: () => void;
  attachTo?: Element;
}

function Aside(props: AsideProps) {
  const expand = props.expand ?? false;
  const component = (
    <aside
      className={classNames(styles.aside, {
        [styles.collapsed]: !expand,
      })}
    >
      <article className={styles.article}>
        <header>
          {props.title && typeof props.title === 'string' ? (
            <>
              <Button
                title="Fermer les filtres"
                className="fr-p-0"
                icon="fr-icon-arrow-right-s-line-double"
                tertiary
                hasBorder={false}
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
