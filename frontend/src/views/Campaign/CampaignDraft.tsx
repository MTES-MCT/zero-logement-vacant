import React, { useEffect, useState } from 'react';
import * as yup from 'yup';

import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useCampaign } from '../../hooks/useCampaign';
import { useForm } from '../../hooks/useForm';
import DraftBody from '../../components/Draft/DraftBody';
import { Campaign } from '../../models/Campaign';
import { DraftCreationPayloadDTO } from '../../../../shared/models/DraftDTO';
import SaveButton from '../../components/Draft/SaveButton';
import { Col, Container, Row } from '../../components/_dsfr';
import {
  useCreateDraftMutation,
  useUpdateDraftMutation,
} from '../../services/draft.service';
import UnsavedChanges from '../../components/UnsavedChanges/UnsavedChanges';
import fp from 'lodash/fp';

const shape = {
  body: yup.string(),
};

interface Props {
  campaign: Campaign;
}

function CampaignDraft(props: Props) {
  const { draft, isLoadingDraft } = useCampaign();

  useDocumentTitle(props.campaign.title ?? 'Campagne');

  const [values, setValues] = useState<DraftCreationPayloadDTO>({
    body: '',
    campaign: props.campaign.id,
  });
  const form = useForm(yup.object().shape(shape), {
    body: values.body,
  });

  const [createDraft, createDraftMutation] = useCreateDraftMutation();
  function create(): void {
    if (!draft) {
      createDraft({
        body: values.body,
        campaign: props.campaign.id,
      });
    }
  }

  const [updateDraft, mutation] = useUpdateDraftMutation();
  function update(): void {
    if (values && draft) {
      updateDraft({
        id: draft.id,
        body: values.body,
      });
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

  const hasChanges = form.isDirty && !fp.equals(draft, values);
  const exists = !!draft;

  return (
    <form id="draft" className="fr-mt-2w">
      <UnsavedChanges when={hasChanges} />
      <Container as="article" fluid>
        <Row justifyContent="right" spacing="mb-2w">
          {exists ? (
            <SaveButton
              isError={mutation.isError}
              isLoading={mutation.isLoading}
              isSuccess={mutation.isSuccess}
              onSave={update}
            />
          ) : (
            <SaveButton
              isError={createDraftMutation.isError}
              isLoading={createDraftMutation.isLoading}
              isSuccess={createDraftMutation.isSuccess}
              onSave={create}
            />
          )}
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