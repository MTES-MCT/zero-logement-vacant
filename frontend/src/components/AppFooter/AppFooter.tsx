import React from 'react';
import { Footer, FooterBody, FooterBodyItem, Link, Logo } from '@dataesr/react-dsfr';

function AppFooter() {

    return(
        <Footer className="fr-mt-4w">
            <FooterBody description="">
                <Logo splitCharacter={10}>Ministère de la transition écologique</Logo>
                <FooterBodyItem>
                    <Link href="https://service-public.fr">
                        service-public.fr
                    </Link>
                </FooterBodyItem>
                <FooterBodyItem>
                    <Link href="https://data.gouv.fr">
                        data.gouv.fr
                    </Link>
                </FooterBodyItem>
            </FooterBody>
        </Footer>
    )

}

export default AppFooter;
