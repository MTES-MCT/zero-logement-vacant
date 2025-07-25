import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import dataAttributes from '../../../utils/data-attributes';
import typeValidation from '../../../utils/type-validation';
import { Icon } from '../../foundation';

const ModalTitle = ({ __TYPE = 'ModalTitle', icon = '', className = '', children, ...remainingProps }) => {
  const _title = (
    <h1
      className={classNames('fr-modal__title', className, {
        'ds-fr--inline-block': icon,
      })}
      id="fr-modal-title-modal"
      {...dataAttributes.getAll(remainingProps)}
    >
      {children}
    </h1>
  );
  return icon ? (
    <Icon name={icon} size="lg">
      {_title}
    </Icon>
  ) : (
    _title
  );
};


ModalTitle.propTypes = {
  // eslint-disable-next-line react/no-unused-prop-types
  __TYPE: typeValidation('ModalTitle'),
  children: PropTypes.oneOfType([PropTypes.string, PropTypes.node]).isRequired,
  icon: PropTypes.string,
  className: PropTypes.string,
};

export default ModalTitle;
