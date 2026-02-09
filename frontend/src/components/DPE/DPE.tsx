import { styled } from '@mui/material/styles';
import { format } from 'date-fns';
import { Predicate } from 'effect';
import type { ReactElement } from 'react';
import { Fragment } from 'react';

const DPEContainer = styled('div', {
  shouldForwardProp: (prop) => prop !== 'value'
})<{ value: string }>(({ value }) => ({
  display: 'inline-flex',
  justifyContent: 'center',
  alignItems: 'center',
  color: value === 'G' ? '#fff' : '#1e1e1e',
  clipPath: 'polygon(0% 0%, 80% 0, 100% 50%, 80% 100%, 0% 100%)',
  width: '2.5rem',
  height: '1.5rem',
  textAlign: 'center',
  paddingRight: '0.5rem',
  lineHeight: 'inherit',
  fontWeight: 700,
  backgroundColor: {
    A: '#519740',
    B: '#67C84D',
    C: '#D6FC5E',
    D: '#FFFD54',
    E: '#F7CD46',
    F: '#F19E4B',
    G: '#EA3223'
  }[value]
}));

interface Props {
  /**
   * The Diagnosis of Performance
   */
  value: string;
  madeAt?: Date | null;
}

function DPE(props: Props) {
  const value = props.value.toUpperCase();

  const additionalInfos: ReactElement[] = [
    props.madeAt ? <>{format(props.madeAt, 'dd/MM/yyyy')}</> : undefined
  ].filter(Predicate.isNotUndefined);

  return (
    <>
      <DPEContainer value={value}>{value}</DPEContainer>
      {additionalInfos.length > 0 && (
        <>
           (
          {additionalInfos.map((elt, index) => (
            <Fragment key={index}>
              {!!index && <> - </>}
              {elt}
            </Fragment>
          ))}
          )
        </>
      )}
    </>
  );
}

export default DPE;
