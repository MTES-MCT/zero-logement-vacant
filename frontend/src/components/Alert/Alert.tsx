import { Alert as DSFRAlert } from '@dataesr/react-dsfr'
import React, { ComponentPropsWithoutRef } from "react";

type AlertType = 'error' | 'success' | 'info' | 'warning';

interface AlertProps extends Omit<ComponentPropsWithoutRef<typeof DSFRAlert>, 'type' | 'title'> {
  type: AlertType
  title?: string
}

const Alert: React.FC<AlertProps> = (props) => {
  return <Alert {...props} />
}

export default Alert
