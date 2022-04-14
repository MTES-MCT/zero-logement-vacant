import React, { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import { Alert, Button, Container, TextInput, Title } from '@dataesr/react-dsfr';
import { ApplicationState } from '../../store/reducers/applicationReducers';
import { useDispatch, useSelector } from 'react-redux';
import { activateAccount, logout } from '../../store/actions/authenticationAction';

import * as yup from 'yup';
import { ValidationError } from 'yup/es';

const AccountActivationView = () => {

    const dispatch = useDispatch();
    const { tokenId } = useParams<{tokenId: string}>();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirmation, setPasswordConfirmation] = useState('');
    const [formErrors, setFormErrors] = useState<any>({});

    const { authUser, activationError } = useSelector((state: ApplicationState) => state.authentication);

    const activationForm = yup.object().shape({
        email: yup
            .string()
            .required('Veuillez renseigner un email.').email('Veuillez renseigner un email valide.'),
        password: yup
            .string()
            .required('Veuillez renseigner un mot de passe.')
            .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])(?=.{8,})/, 'Le mot de passe doit contenir 8 caractères avec au moins une majuscule, une minuscule, un chiffre et un caractère spécial'),
        passwordConfirmation: yup
            .string()
            .required('Veuillez renseigner un mot de passe.')
            .oneOf([yup.ref('password')], 'Les mots de passes doivent être identiques.')
    });

    useEffect(() => {
        if (authUser) {
            dispatch(logout())
        }
    }, [dispatch])

    const submitActivationForm = (e: FormEvent<HTMLFormElement>) => {
        setFormErrors({});
        e.preventDefault();
        activationForm
            .validate({ email, password, passwordConfirmation }, {abortEarly: false})
            .then(() => {dispatch(activateAccount(email, tokenId, password))})
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
                <Title as="h1">Activation de votre compte</Title>
                <form onSubmit={submitActivationForm} id="account_activation_form">
                    <TextInput
                        value={email}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                        messageType={formErrors['email'] ? 'error' : ''}
                        message={formErrors['email']}
                        label="Adresse email : "
                    />
                    <TextInput
                        value={password}
                        type="password"
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                        messageType={formErrors['password'] ? 'error' : ''}
                        message={formErrors['password']}
                        label="Mot de passe : "
                    />
                    <TextInput
                        value={passwordConfirmation}
                        type="password"
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setPasswordConfirmation(e.target.value)}
                        messageType={formErrors['passwordConfirmation'] ? 'error' : ''}
                        message={formErrors['passwordConfirmation']}
                        data-testid="password-confirmation-input"
                        label="Confirmation du mot de passe : "
                    />
                    <Button
                        submit
                        title="Valider"
                        data-testid="login-button">
                        Valider
                    </Button>
                </form>
                {activationError &&
                    <div className="fr-my-2w">
                        <Alert title="Erreur" description={activationError} type="error"/>
                    </div>
                }
            </Container>
        </>
    );
};

export default AccountActivationView;

