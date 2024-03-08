import { useEffect, useState } from 'react';
import { Redirect } from 'react-router-dom';
import * as yup from 'yup';

import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useCampaign } from '../../hooks/useCampaign';
import { useForm } from '../../hooks/useForm';
import DraftBody from '../../components/Draft/DraftBody';
import { Draft } from '../../models/Draft';

const shape = {
  body: yup.string(),
};

type FormShape = typeof shape;

function CampaignDraftView() {
  const { campaign, draft, isLoadingCampaign, isLoadingDraft } = useCampaign();

  useDocumentTitle(campaign?.title ?? 'Campagne');

  const [values, setValues] = useState<Draft>();
  const form = useForm(yup.object().shape(shape), {
    body: values?.body,
  });

  useEffect(() => {
    if (draft) {
      setValues(draft);
    }
  }, [draft]);

  if (!campaign || !draft) {
    if (isLoadingCampaign || isLoadingDraft) {
      return <Loading />;
    }
    return <Redirect to="/404" />;
  }

  if (!campaign && !isLoadingCampaign) {
    return <Redirect to="/404" />;
  }

  if (!draft && !isLoadingDraft) {
    return <Redirect to="/404" />;
  }

  if (!values) {
    return <Loading />;
  }

  return (
    <form id="draft" className="fr-mt-2w">
      <DraftBody
        form={form}
        value={values.body}
        onChangeValue={(body) => setValues({ ...values, body: body })}
      />
    </form>
  );
}

function Loading() {
  return <></>;
}

export default CampaignDraftView;
