import { useEffect, useState } from 'react';
import * as yup from 'yup';

import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useCampaign } from '../../hooks/useCampaign';
import { useForm } from '../../hooks/useForm';
import DraftBody from '../../components/Draft/DraftBody';
import { Draft } from '../../models/Draft';
import NotFoundView from '../NotFoundView';

const shape = {
  body: yup.string(),
};

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
    return <NotFoundView />;
  }

  if (!campaign && !isLoadingCampaign) {
    return <NotFoundView />;
  }

  if (!draft && !isLoadingDraft) {
    return <NotFoundView />;
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
