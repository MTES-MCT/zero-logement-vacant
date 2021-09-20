import React, { ChangeEvent, FormEvent, useState } from 'react';
import { Redirect } from 'react-router-dom';

import { Alert, Button, Container, TextInput } from '@dataesr/react-dsfr';
import authService from '../../services/auth.service';

const LoginView = () => {

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const [user, setUser] = useState(undefined);

    const login = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        authService.signin(email, password)
            .then(_ => setUser(_))
            .catch(_ => {
                setError('Identifiants invalides');
            });
    };

    if (user) {
        return <Redirect to="/logements" />;
    }

    return (
        <>
            <Container spacing="py-4w">
                <form onSubmit={login} id="login_form">
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

