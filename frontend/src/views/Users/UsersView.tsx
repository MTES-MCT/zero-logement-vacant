import React, { useMemo, useState } from 'react';
import config from '../../utils/config';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import MainContainer from '../../components/MainContainer/MainContainer';
import { useAppSelector } from '../../hooks/useStore';
import * as jose from 'jose';

const UsersView = () => {
  useDocumentTitle('Utilisateurs');

  const { authUser } = useAppSelector((state) => state.authentication);

  const [iframeUrl, setIframeUrl] = useState<string>();

  useMemo(async () => {
    if (
      !authUser?.establishment.id ||
      !config.metabase.siteUrl ||
      !config.metabase.embed.userDashboard ||
      !config.metabase.secretKey
    ) {
      setIframeUrl(undefined);
    } else {
      console.log(
        'authUser.user.establishmentId',
        authUser.user.establishmentId
      );

      const payload = {
        resource: { dashboard: Number(config.metabase.embed.userDashboard) },
        params: {
          id: authUser.establishment.id,
        },
        exp: Math.round(Date.now() / 1000) + 10 * 60, // 10 minute expiration
      };
      var token = await new jose.SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .sign(new TextEncoder().encode(config.metabase.secretKey));

      setIframeUrl(
        `${config.metabase.siteUrl}/embed/dashboard/${token}#theme=transparent&bordered=false&titled=false`
      );
    }
  }, [authUser]); //eslint-disable-line react-hooks/exhaustive-deps

  return (
    <MainContainer title="Utilisateurs">
      {iframeUrl !== undefined ? (
        <iframe
          src={iframeUrl}
          width="100%"
          height="700"
          title="Utilisateurs"
        ></iframe>
      ) : (
        <></>
      )}
    </MainContainer>
  );
};

export default UsersView;
