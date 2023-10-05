import {
  Stepper as DSFRStepper,
  StepperProps,
} from '../../components/dsfr/index';
import React from 'react';

const Stepper: React.FC<StepperProps> = (props) => {
  // Required because DSFR Tab has properties 'activeTab' and 'index'
  // which come from the DSFR Tabs component state. This state is not accessible
  // to a child component.
  return <DSFRStepper {...props} />;
};

export default Stepper;
