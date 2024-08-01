import { useForm } from '../../hooks/useForm';
import styles from './draft.module.scss';
import RichEditor from '../RichEditor/RichEditor';
import AppTextInput from '../_app/AppTextInput/AppTextInput';
import { Col, Container, Row } from '../_dsfr';
import AppLink from '../_app/AppLink/AppLink';

interface Props {
  form: ReturnType<typeof useForm>;
  subject: string;
  body: string;
  onChange(value: Body): void;
}

export interface Body {
  subject: string;
  body: string;
}

function DraftBody(props: Readonly<Props>) {
  return (
    <Container as="article" className={styles.article} fluid>
      <Row className="fr-mb-2w justify-space-between">
        <h6 id="draft-body-label" className="fr-mb-0">
          Contenu de votre courrier (obligatoire)
        </h6>
        <AppLink
          isSimple
          target="_blank"
          to="https://zlv.notion.site/R-diger-un-courrier-15e88e19d2bc404eaf371ddcb4ca42c5"
        >
          Comment rédiger un bon courrier ?
        </AppLink>
      </Row>
      <Row className="fr-mb-2w">
        <Col n="7">
          <AppTextInput
            inputForm={props.form}
            inputKey="subject"
            label="Objet*"
            value={props.subject}
            onChange={(event) =>
              props.onChange({
                subject: event.target.value,
                body: props.body,
              })
            }
          />
        </Col>
      </Row>
      <Row>
        <RichEditor
          inputForm={props.form}
          inputKey="body"
          ariaLabelledBy="draft-body-label"
          content={props.body}
          onChange={(content) =>
            props.onChange({
              subject: props.subject,
              body: content
            })
          }
        />
      </Row>
    </Container>
  );
}

export default DraftBody;
