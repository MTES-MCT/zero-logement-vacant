import React, { ChangeEvent, FormEvent, useState } from 'react';
import { useLocation } from 'react-router-dom';

import { Alert, Button, Container, Select, TextInput } from '@dataesr/react-dsfr';
import { ApplicationState } from '../../store/reducers/applicationReducers';
import { useDispatch, useSelector } from 'react-redux';
import { login } from '../../store/actions/authenticationAction';

import * as yup from 'yup';
import { ValidationError } from 'yup/es';

const LoginView = () => {

    const dispatch = useDispatch();
    const { pathname } = useLocation();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [establishmentId, setEstablishmentId] = useState<string | undefined>('');
    const [formErrors, setFormErrors] = useState<any>({});

    const { error } = useSelector((state: ApplicationState) => state.authentication);

    const loginForm = yup.object().shape({
        isAdmin: yup.boolean(),
        email: yup.string().required('Veuillez renseigner un email.').email('Veuillez renseigner un email valide.'),
        password: yup.string().required('Veuillez renseigner un mot de passe.'),
        establishmentId: yup.string().when('isAdmin', {
            is: true,
            then: yup.string().min(1, 'Veuillez sélectionner un EPCI.')
        })
    });

    const submitLoginForm = (e: FormEvent<HTMLFormElement>) => {
        setFormErrors({});
        e.preventDefault();
        loginForm
            .validate({ isAdmin: pathname === '/admin', email, password, establishmentId }, {abortEarly: false})
            .then(() => dispatch(login(email, password, Number(establishmentId))))
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

    const establishmentOptions = [
        { value: '', label: 'Sélectionner un EPCI', disabled: true },
        { value: '200043172', label: 'CA du Bassin de Brive' },
        { value: '200066637', label: 'CC Hautes Terres Communauté' },
        { value: '200066660', label: 'CC Saint-Flour Communauté' },
        { value: '200067205', label: 'CA du Cotentin' },
        { value: '200070464', label: 'CC Cœur de Maurienne Arvan' },
        { value: '200071082', label: 'CA Montluçon Communauté' },
        { value: '243600327', label: 'CA Châteauroux Métropole' },
        { value: '247200090', label: 'CC de Sablé-sur-Sarthe' }
    ];

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
                    {pathname === ('/admin') &&
                        <Select
                            label="Lancement"
                            selected={establishmentId}
                            options={establishmentOptions}
                            messageType={formErrors['establishmentId'] ? 'error' : undefined}
                            message={formErrors['establishmentId']}
                            onChange={(e: any) => setEstablishmentId(e.target.value)}
                        />
                    }
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

