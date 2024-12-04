import authenticationSlice from '../reducers/authenticationReducer';

export const { logOut } = authenticationSlice.actions;
export { changeEstablishment, logIn } from '../thunks/auth-thunks';
