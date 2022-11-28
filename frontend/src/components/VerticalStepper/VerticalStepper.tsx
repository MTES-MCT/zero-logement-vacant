import { ReactElement } from 'react';
import { findChildren } from '../../utils/elementUtils';
import VerticalStep from './VerticalStep';

interface VerticalStepperProps {
  children?: ReactElement | ReactElement[]
  step: number
}

function VerticalStepper(props: VerticalStepperProps) {
  const steps = findChildren(props.children, VerticalStep)

  const verticalSteps = steps?.map((step, i) => {
    return <VerticalStep {...step.props} key={i} index={i} />
  })
  return (
    <div>
      {verticalSteps}
    </div>
  )
}

export default VerticalStepper
