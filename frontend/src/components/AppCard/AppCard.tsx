import React from 'react';
import { Card, CardDescription, Text } from '@dataesr/react-dsfr';
import classNames from 'classnames';

interface Props {
    children: any
    icon: string,
    isGrey?: boolean
}

function AppCard(
    {
        children,
        icon,
        isGrey = false
    }: Props) {

    return(
        <Card hasArrow={false} hasBorder={false} isGrey={isGrey} className={classNames('app-card-xs', {'bg-bf925': !isGrey})}>
            <CardDescription className="fr-p-1w">
                <Text as="span" size="md" className={classNames(icon, isGrey ? 'color-grey-850' : 'color-bf925-active')} aria-hidden="true">
                </Text>
                <div>
                    {children}
                </div>
            </CardDescription>
        </Card>
    )

}

export default AppCard;
