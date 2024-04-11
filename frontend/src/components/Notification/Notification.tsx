import { ToastContainer } from 'react-toastify';

function Notification() {
  return (
    <ToastContainer
      autoClose={5000}
      closeOnClick
      draggable
      limit={3}
      position="top-right"
    />
  );
}

export default Notification;
