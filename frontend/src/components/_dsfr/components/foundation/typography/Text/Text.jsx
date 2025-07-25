import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { getSpace } from '../../../../utils/getters';

/**
 *
 * @visibleName Text
 */
const Text = ({
  as = 'p',
  size = 'md',
  alt = false,
  bold = false,
  className = '',
  spacing = '',
  children,
}) => {
  const HtmlTag = `${as}`;
  const { margin, padding } = getSpace(spacing);
  const _className = classNames(className, padding, margin, {
    'fr-text--alt': size !== 'lead' && alt,
    'fr-text--heavy': bold,
    [`fr-text--${size}`]: size,
  });
  return <HtmlTag className={_className}>{children}</HtmlTag>;
};

Text.propTypes = {
  /**
   * html tag to render
   */
  as: PropTypes.oneOf(['p', 'span']),
  size: PropTypes.oneOf(['xs', 'sm', 'md', 'lg', 'lead']),
  spacing: PropTypes.string,
  /**
   * If true Spectral is used instead of Marianne.
   */
  alt: PropTypes.bool,
  bold: PropTypes.bool,
  children: PropTypes.oneOfType([PropTypes.string, PropTypes.node]).isRequired,
  className: PropTypes.string,
};

export default Text;
