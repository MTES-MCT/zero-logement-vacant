import { ToastContainer } from 'react-toastify';

function Notification() {
  return (
    <ToastContainer
      autoClose={3000}
      closeOnClick
      draggable
      limit={3}
      position="top-right"
    />
  );
}

export default Notification;
