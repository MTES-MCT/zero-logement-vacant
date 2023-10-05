import { ReactElement, ReactNode } from 'react';
import styles from './vertical-stepper.module.scss';
import classNames from 'classnames';
import { Icon, Text } from '../_dsfr/index';

type StepStatus = 'error' | 'valid';

interface VerticalStepProps {
  actions?: ReactElement;
  content?: ReactNode | ReactNode[];
  completed?: boolean;
  disabled?: boolean;
  index?: number;
  status?: StepStatus;
  title: string;
}

function VerticalStep(props: VerticalStepProps) {
  const stepClasses = classNames(styles.step, {
    [styles.disabled]: props.disabled,
    [styles.completed]: props.completed,
  });

  return (
    <section className={stepClasses}>
      {props.disabled ? (
        <>
          <div className={styles.disabledOverlay} />
          <Icon
            className={styles.disabledIcon}
            name="fr-icon-lock-line"
            size="xl"
          />
        </>
      ) : null}
      <aside>
        <div className={styles.index}>
          {props.completed ? (
            <Icon
              name="fr-icon-check-line"
              verticalAlign="middle"
              iconPosition="center"
              size="1x"
            />
          ) : props.index !== undefined ? (
            props.index + 1
          ) : null}
        </div>
      </aside>
      <article className={styles.article}>
        <header>
          <Text as="span" className={styles.title} size="lg" spacing="mb-2w">
            {props.title}
          </Text>
        </header>
        <main>
          {typeof props.content === 'string' ? (
            <Text as="p">{props.content}</Text>
          ) : (
            props.content
          )}
        </main>
        <footer>{props.actions}</footer>
      </article>
    </section>
  );
}

export default VerticalStep;
