import React, { ChangeEvent, FormEvent, useState } from 'react';
import { Redirect } from 'react-router-dom';

import { Alert, Button, Container, TextInput } from '@dataesr/react-dsfr';
import { ApplicationState } from '../../store/reducers/applicationReducers';
import { useDispatch, useSelector } from 'react-redux';
import { login } from '../../store/actions/authenticationAction';

const LoginView = () => {

    const dispatch = useDispatch();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const { user, error } = useSelector((state: ApplicationState) => state.authentication);

    const submitLoginForm = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        dispatch(login(email, password));
    };

    if (user) {
        return <Redirect to="/logements" />;
    }

    return (
        <>
            <Container spacing="py-4w">
                <form onSubmit={submitLoginForm} id="login_form">
                    <TextInput
                        value={email}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                        required
                        data-testid="email-input"
                        label="Adresse email : "
                    />
                    <div className="fr-input-group" data-testid="password-input">
                        <label className="fr-label" htmlFor="text-input-password">
                            Mot de passe :
                            <span className="error"> *</span>
                        </label>
                        <div className="fr-input-wrap">
                            <input
                                className="fr-input"
                                type="password"
                                id="text-input-password"
                                name="text-input-password"
                                required
                                value={password}
                                onChange={e => setPassword(e.target.value)}/>
                        </div>
                    </div>
                    <Button
                        submit
                        data-testid="login-button">
                        Se connecter
                    </Button>
                </form>
                {error &&
                    <div data-testid="alert-error" className="fr-my-2w">
                        <Alert title="Erreur" description={error} type="error"/>
                    </div>
                }
            </Container>
        </>
    );
};

export default LoginView;

