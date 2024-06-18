import { Container } from '../_dsfr';
import { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import classNames from 'classnames';
import styles from './aside.module.scss';
import Button from '@codegouvfr/react-dsfr/Button';
import Typography from '@mui/material/Typography';

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
        [styles.collapsed]: !expand
      })}
    >
      <article className={classNames(styles.article, props.className)}>
        {props.title && typeof props.title === 'string' ? (
          <Container as="header" className="d-flex" fluid>
            <Typography component="h6" className="d-inline-block" mb={0} pt={1}>
              {props.title}
            </Typography>

            <Button
              priority="tertiary no outline"
              iconId="ri-close-line"
              iconPosition="right"
              onClick={props.onClose}
            >
              Fermer
            </Button>
          </Container>
        ) : (
          props.title
        )}
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
