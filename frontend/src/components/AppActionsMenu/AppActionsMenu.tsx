import React, { useRef, useState } from 'react';
import styles from './app-actions-menu.module.scss';
import { useOutsideClick } from '../../hooks/useOutsideClick';

export interface MenuAction {
    title: string,
    onClick: () => void
}

const AppActionsMenu = (
    {
        actions
    }: {
        actions: MenuAction[]
    }) => {

    const [expandActions, setExpandActions] = useState<boolean>(false);

    const wrapperRef = useRef(null);
    useOutsideClick(wrapperRef, () => setExpandActions(false));

    return (
        <div className={styles.actionsMenuContainer} ref={wrapperRef}>
            <button
                className="ds-fr--inline fr-link"
                type="button"
                title={expandActions? 'Masquer les actions' : 'Afficher les actions'}
                aria-controls="actions"
                aria-expanded={expandActions}
                onClick={() => {setExpandActions(!expandActions)}}
            >
                Actions<span className="ri-more-2-fill" aria-hidden="true" />
            </button>
            {expandActions &&
            <div className={styles.actions}>
                {actions.map((action, actionIdx) =>
                    <button  key={'action_' + actionIdx}
                             className="ds-fr--inline fr-link"
                             type="button"
                             title={action.title}
                             onClick={action.onClick}
                    >
                        {action.title}
                    </button>
                )}
            </div>
            }
        </div>
    );
};

export default AppActionsMenu;

