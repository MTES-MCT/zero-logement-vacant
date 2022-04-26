import React, { ChangeEvent, FormEvent, useEffect, useState } from 'react';

import { Alert, Button, Container, TextInput, Title } from '@dataesr/react-dsfr';
import { ApplicationState } from '../../store/reducers/applicationReducers';
import { useDispatch, useSelector } from 'react-redux';
import { changePassword, initPasswordChange } from '../../store/actions/authenticationAction';

import * as yup from 'yup';
import { ValidationError } from 'yup/es';
import { FormState } from '../../store/actions/FormState';

const AccountPasswordView = () => {

    const dispatch = useDispatch();

    const [currentPassword, setCurrentPassword] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirmation, setPasswordConfirmation] = useState('');
    const [formErrors, setFormErrors] = useState<any>({});

    const { passwordFormState } = useSelector((state: ApplicationState) => state.authentication);

    useEffect(() => {
        dispatch(initPasswordChange())
    }, [dispatch])

    const passwordForm = yup.object().shape({
        currentPassword: yup
            .string()
            .required('Veuillez renseigner votre mot de passe actuel.'),
        password: yup
            .string()
            .required('Veuillez renseigner votre nouveau mot de passe.')
            .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])(?=.{8,})/, 'Le mot de passe doit contenir 8 caractères avec au moins une majuscule, une minuscule, un chiffre et un caractère spécial'),
        passwordConfirmation: yup
            .string()
            .required('Veuillez renseigner votre mot de passe.')
            .oneOf([yup.ref('password')], 'Les mots de passe doivent être identiques.')
    });

    const submitPasswordForm = (e: FormEvent<HTMLFormElement>) => {
        setFormErrors({});
        e.preventDefault();
        passwordForm
            .validate({ currentPassword, password, passwordConfirmation }, {abortEarly: false})
            .then(() => {dispatch(changePassword(currentPassword, password))})
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
                <Title as="h1">Modification du mot de passe</Title>
                {passwordFormState === FormState.Error &&
                    <div className="fr-my-2w">
                        <Alert title="Erreur" description="Une erreur s'est produite, veuillez réessayer" type="error"/>
                    </div>
                }
                {passwordFormState === FormState.Succeed ?
                    <div className="fr-my-2w">
                        <Alert title="" description="La modification du mot de passe a bien été effectuée" type="success"/>
                    </div> :

                    <form onSubmit={submitPasswordForm} id="account_password_form">
                        <TextInput
                            value={currentPassword}
                            type="password"
                            onChange={(e: ChangeEvent<HTMLInputElement>) => setCurrentPassword(e.target.value)}
                            messageType={formErrors['currentPassword'] ? 'error' : ''}
                            message={formErrors['currentPassword']}
                            label="Mot de passe actuel : "
                        />
                        <TextInput
                            value={password}
                            type="password"
                            onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                            messageType={formErrors['password'] ? 'error' : ''}
                            message={formErrors['password']}
                            label="Nouveau mot de passe : "
                        />
                        <TextInput
                            value={passwordConfirmation}
                            type="password"
                            onChange={(e: ChangeEvent<HTMLInputElement>) => setPasswordConfirmation(e.target.value)}
                            messageType={formErrors['passwordConfirmation'] ? 'error' : ''}
                            message={formErrors['passwordConfirmation']}
                            label="Confirmation du nouveau mot de passe : "
                        />
                        <Button
                            submit
                            title="Valider"
                            data-testid="login-button">
                            Valider
                        </Button>
                    </form>
                }
            </Container>
        </>
    );
};

export default AccountPasswordView;

