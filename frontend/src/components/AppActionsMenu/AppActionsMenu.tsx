import React, { useRef, useState } from 'react';
import styles from './app-actions-menu.module.scss';
import { useOutsideClick } from '../../hooks/useOutsideClick';
import { SelectedHousing } from '../../models/Housing';
import { Alert } from "@dataesr/react-dsfr";
import classNames from 'classnames';

export interface MenuAction {
    title: string,
    icon?: string,
    selectedHousing?: SelectedHousing,
    onClick: () => void
}

const AppActionsMenu = (
    {
        title,
        icon,
        iconPosition = 'right',
        actions
    } : {
        title?: string,
        icon?: string,
        iconPosition?: string,
        actions: MenuAction[]
    }) => {

    const [expandActions, setExpandActions] = useState<boolean>(false);
    const [actionAlert, setActionAlert] = useState(false);

    const handleAction = (action : MenuAction) => {
        if (!action.selectedHousing?.all && action.selectedHousing?.ids.length === 0) {
            setActionAlert(true)
            setExpandActions(false);
        } else {
            setActionAlert(false);
            setExpandActions(false);
            action.onClick()
        }
    }

    const wrapperRef = useRef(null);
    useOutsideClick(wrapperRef, () => setExpandActions(false));

    return (
        <>
            {actionAlert &&
                <Alert title=""
                       description="Vous devez sélectionner au moins un logement réaliser cette action."
                       className="fr-my-3w"
                       type="error"
                       onClose={() => setActionAlert(false)}
                       data-testid="no-housing-alert"
                       closable/>
            }
            <div className={styles.actionsMenuContainer}>
                <div className={styles.actionsMenuFitContainer} ref={wrapperRef}>
                    <button
                        className="fr-link"
                        type="button"
                        title={expandActions? 'Masquer les actions' : 'Afficher les actions'}
                        aria-controls="actions"
                        aria-expanded={expandActions}
                        onClick={() => {setExpandActions(!expandActions)}}
                    >
                        {iconPosition === 'left' &&
                            <span className={classNames('fr-mr-1w', icon ?? 'ri-more-2-fill')} aria-hidden="true" />
                        }
                        <span>{title ?? 'Actions'}</span>
                        {iconPosition === 'right' &&
                            <span className={classNames(icon ?? 'ri-more-2-fill')} aria-hidden="true" />
                        }
                    </button>
                    {expandActions &&
                    <div className={styles.actions}>
                        {actions.map((action, actionIdx) =>
                            <button  key={'action_' + actionIdx}
                                     className="ds-fr--inline fr-link"
                                     type="button"
                                     title={action.title}
                                     onClick={() => handleAction(action)}
                            >
                                {action.icon &&
                                    <span className={classNames('fr-mr-1w', action.icon)} aria-hidden="true"/>
                                }
                                {action.title}
                            </button>
                        )}
                    </div>
                    }
                </div>
            </div>
        </>
    );
};

export default AppActionsMenu;

