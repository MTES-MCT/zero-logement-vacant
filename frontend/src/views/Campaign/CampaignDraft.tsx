import React, { useEffect, useState } from 'react';
import * as yup from 'yup';

import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useCampaign } from '../../hooks/useCampaign';
import { useForm } from '../../hooks/useForm';
import DraftBody from '../../components/Draft/DraftBody';
import { Campaign } from '../../models/Campaign';
import { DraftPayloadDTO } from '../../../../shared/models/DraftDTO';
import SaveButton from '../../components/Draft/SaveButton';
import { Col, Container, Row } from '../../components/_dsfr';
import { useUpdateDraftMutation } from '../../services/draft.service';

const shape = {
  body: yup.string(),
};

interface Props {
  campaign: Campaign;
}

function CampaignDraft(props: Props) {
  const { draft, isLoadingDraft } = useCampaign();

  useDocumentTitle(props.campaign.title ?? 'Campagne');

  const [values, setValues] = useState<DraftPayloadDTO>({
    body: '',
    campaign: props.campaign.id,
  });
  const form = useForm(yup.object().shape(shape), {
    body: values.body,
  });

  const [updateDraft, mutation] = useUpdateDraftMutation();
  function save(): void {
    if (values) {
      updateDraft(values);
    }
  }

  useEffect(() => {
    if (draft) {
      setValues({
        body: draft.body ?? '',
        campaign: props.campaign.id,
      });
    }
  }, [draft, props.campaign.id]);

  if (isLoadingDraft) {
    return <Loading />;
  }

  if (!values) {
    return <Loading />;
  }

  return (
    <form id="draft" className="fr-mt-2w">
      <Container as="article" fluid>
        <Row justifyContent="right" spacing="mb-2w">
          <SaveButton
            isLoading={mutation.isLoading}
            isSuccess={mutation.isSuccess}
            onSave={save}
          />
        </Row>
        <Row>
          <Col>
            <DraftBody
              form={form}
              value={values.body}
              onChangeValue={(body) => setValues({ ...values, body: body })}
            />
          </Col>
        </Row>
      </Container>
    </form>
  );
}

function Loading() {
  return <></>;
}

export default CampaignDraft;
