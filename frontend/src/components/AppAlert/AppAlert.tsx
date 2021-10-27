import React from 'react';
import { Col, Container, Row } from '@dataesr/react-dsfr';


const AppAlert = ({ content, submitTitle, onSubmit } : { content: any, submitTitle: string, onSubmit?: () => void }) => {

    return (
        <Container>
            <div role="alert" className="fr-alert fr-alert--info fr-my-3w">
                <Row className="fr-grid-row--middle">
                    <Col>
                        {content}
                    </Col>
                    {onSubmit &&
                    <Col n="2">
                        <button type="button"
                                className="fr-btn--sm float-right fr-btn fr-btn--secondary"
                                onClick={() => onSubmit()}
                                title={submitTitle}>
                            {submitTitle}
                        </button>
                    </Col>
                    }
                </Row>
            </div>
        </Container>
    );
};

export default AppAlert;
