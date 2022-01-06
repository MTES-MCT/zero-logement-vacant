import React, { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

import { Alert, Button, Container, Select, TextInput } from '@dataesr/react-dsfr';
import { ApplicationState } from '../../store/reducers/applicationReducers';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAvailableEstablishments, login } from '../../store/actions/authenticationAction';

import * as yup from 'yup';
import { ValidationError } from 'yup/es';

const LoginView = () => {

    const dispatch = useDispatch();
    const { pathname } = useLocation();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [availableEstablishmentOptions, setAvailableEstablishmentOptions] = useState<{ value: string, label: string, disabled?: boolean }[] | undefined>();
    const [establishmentId, setEstablishmentId] = useState<string>('');
    const [formErrors, setFormErrors] = useState<any>({});

    const { error, availableEstablishments } = useSelector((state: ApplicationState) => state.authentication);

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
    }, [dispatch])

    useEffect(() => {
        if (availableEstablishments) {
            setAvailableEstablishmentOptions([
                { value: '', label: 'Sélectionner un établissement', disabled: true },
                ...availableEstablishments.map(e => ({
                    value: e.id,
                    label: e.name
                }))
            ])
        }
    }, [availableEstablishments])

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
                <form onSubmit={submitLoginForm} id="login_form">
                    <TextInput
                        value={email}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                        messageType={formErrors['email'] ? 'error' : ''}
                        message={formErrors['email']}
                        data-testid="email-input"
                        label="Adresse email : "
                    />
                    <TextInput
                        value={password}
                        type='password'
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                        messageType={formErrors['password'] ? 'error' : ''}
                        message={formErrors['password']}
                        data-testid="password-input"
                        label="Mot de passe : "
                    />
                    {pathname === ('/admin') && availableEstablishmentOptions &&
                        <Select
                            label="Lancement"
                            selected={establishmentId}
                            options={availableEstablishmentOptions}
                            messageType={formErrors['establishmentId'] ? 'error' : undefined}
                            message={formErrors['establishmentId']}
                            onChange={(e: any) => setEstablishmentId(e.target.value)}
                        />
                    }
                    <Button
                        submit
                        title="Se connecter"
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

