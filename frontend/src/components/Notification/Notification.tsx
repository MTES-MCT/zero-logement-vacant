import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import './notification.scss';

function Notification() {
  return <ToastContainer closeOnClick={false} />;
}

export default Notification;
