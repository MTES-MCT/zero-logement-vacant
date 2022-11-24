import React, { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

import { Button, Container, TextInput } from '@dataesr/react-dsfr';
import { ApplicationState } from '../../store/reducers/applicationReducers';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAvailableEstablishments, login } from '../../store/actions/authenticationAction';

import * as yup from 'yup';
import { ValidationError } from 'yup/es';
import EstablishmentSearchableSelect
    from '../../components/EstablishmentSearchableSelect/EstablishmentSearchableSelect';
import Alert from '../../components/Alert/Alert';

const LoginView = () => {

    const dispatch = useDispatch();
    const { pathname } = useLocation();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [establishmentId, setEstablishmentId] = useState<string>('');
    const [formErrors, setFormErrors] = useState<any>({});

    const { loginError, isLoggedOut } = useSelector((state: ApplicationState) => state.authentication);

    const loginForm = yup.object().shape({
        isAdmin: yup.boolean(),
        email: yup.string().required('Veuillez renseigner un email.').email('Veuillez renseigner un email valide.'),
        password: yup.string().required('Veuillez renseigner un mot de passe.'),
        establishmentId: yup.string().when('isAdmin', {
            is: true,
            then: yup.string().min(1, 'Veuillez sélectionner un établissement.')
        })
    });

    useEffect(() => {
        if (pathname === '/admin') {
            dispatch(fetchAvailableEstablishments())
        }
    }, [dispatch, pathname])

    const submitLoginForm = (e: FormEvent<HTMLFormElement>) => {
        setFormErrors({});
        e.preventDefault();
        loginForm
            .validate({ isAdmin: pathname === '/admin', email, password, establishmentId }, {abortEarly: false})
            .then(() => dispatch(login(email, password, establishmentId.length ? establishmentId : undefined)))
            .catch(err => {
                const object: any = {};
                err.inner.forEach((x: ValidationError) => {
                    if (x.path !== undefined && x.errors.length) {
                        object[x.path] = x.errors[0];
                    }
                });
                setFormErrors(object);
            })
    };

    return (
        <>
            <Container spacing="py-4w">
                {isLoggedOut &&
                    <Alert title="Déconnexion"
                           description="Vous êtes déconnecté. Veuillez saisir votre email et votre mot de passe pour vous connecter de nouveau."
                           className="fr-my-3w"
                           type="warning"
                           closable/>
                }
                <form onSubmit={submitLoginForm} id="login_form">
                    <TextInput
                        value={email}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                        messageType={formErrors['email'] ? 'error' : ''}
                        message={formErrors['email']}
                        data-testid="email-input"
                        label="Adresse email : "
                        required
                    />
                    <TextInput
                        value={password}
                        type="password"
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                        messageType={formErrors['password'] ? 'error' : ''}
                        message={formErrors['password']}
                        data-testid="password-input"
                        label="Mot de passe : "
                        required
                    />
                    {pathname === ('/admin') &&
                        <EstablishmentSearchableSelect onChange={(id: string) => setEstablishmentId(id)} />
                    }
                    <Button
                        submit
                        title="Se connecter"
                        data-testid="login-button">
                        Se connecter
                    </Button>
                </form>
                {loginError &&
                    <div data-testid="alert-error" className="fr-my-2w">
                        <Alert title="Erreur" description={loginError} type="error"/>
                    </div>
                }
            </Container>
        </>
    );
};

export default LoginView;

