import { fr } from '@codegouvfr/react-dsfr';
import Checkbox from '@codegouvfr/react-dsfr/Checkbox';
import { MenuItem, Select, SelectChangeEvent } from '@mui/material';
import { List, Set } from 'immutable';
import { useId, useRef } from 'react';
import { match } from 'ts-pattern';

import {
  byCreatedAt,
  byStatus,
  CampaignStatus,
  isCampaignStatus
} from '@zerologementvacant/models';
import { desc } from '@zerologementvacant/utils';
import { Campaign } from '../../models/Campaign';
import CampaignStatusBadge from '../Campaign/CampaignStatusBadge';
import styles from './housing-list-filters.module.scss';
import { NoCampaign, noCampaignOption } from '../../models/HousingFilters';

interface Props {
  options: ReadonlyArray<Campaign>;
  values: ReadonlyArray<Campaign['id'] | null>;
  onChange?(campaigns: ReadonlyArray<Campaign['id'] | null>): void;
}

function CampaignFilter(props: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const labelId = `fr-label-${useId()}`;
  const selectId = `fr-select-${useId()}`;

  const selectedCampaigns: ReadonlyArray<Campaign> = props.values
    .filter((value) => value !== null)
    .map(
      (value) => props.options.find((option) => option.id === value) as Campaign
    );
  const selectedStatuses = groupByStatus(selectedCampaigns).filter(
    (campaigns, status) => {
      const optionsByStatus = props.options.filter(
        (option) => option.status === status
      );
      return optionsByStatus.length === campaigns.size;
    }
  );
  const selected: ReadonlyArray<Campaign['id'] | CampaignStatus | NoCampaign> =
    props.values.concat(selectedStatuses.keySeq().toArray()).map((value) => {
      return value === null ? (noCampaignOption.value as NoCampaign) : value;
    });

  function onChange(event: SelectChangeEvent<ReadonlyArray<string>>): void {
    if (Array.isArray(event.target.value)) {
      const ids = Set<string>(event.target.value).filterNot(isCampaignStatus);
      const statuses = Set<string>(event.target.value).filter(isCampaignStatus);
      const diff = selected
        .filter((selected) => {
          return (
            !ids.includes(selected) &&
            !statuses.includes(selected as CampaignStatus)
          );
        })
        .flatMap((selected) => {
          return isCampaignStatus(selected)
            ? props.options
                .filter((option) => option.status === selected)
                .map((option) => option.id)
            : selected;
        });

      props.onChange?.(
        ids
          .filter((value) => value !== noCampaignOption.value)
          .map(getCampaign(props.options))
          .filter((campaign) => campaign !== null)
          .union(
            statuses.flatMap((status) =>
              props.options.filter((option) => option.status === status)
            )
          )
          .filter((campaign) => !diff.includes(campaign.id))
          .map((campaign) => campaign.id)
          .concat(ids.includes(noCampaignOption.value) ? [null] : [])
          .toArray()
      );
    }
  }

  const categories = groupByStatus(props.options).toArray();

  return (
    <div className={fr.cx('fr-select-group')} ref={ref}>
      <label className={fr.cx('fr-label')} id={labelId}>
        Campagne
      </label>
      <Select
        classes={{
          root: fr.cx('fr-mt-1w'),
          select: fr.cx('fr-select', 'fr-pt-1w', 'fr-pr-5w'),
          icon: fr.cx('fr-hidden')
        }}
        displayEmpty
        label="Toutes"
        id={selectId}
        labelId={labelId}
        MenuProps={{
          anchorOrigin: {
            vertical: 'bottom',
            horizontal: 'left'
          },
          elevation: 0,
          marginThreshold: null,
          disableScrollLock: true,
          sx: {
            filter: 'drop-shadow(var(--raised-shadow))',
            maxHeight: '40rem'
          },
          transformOrigin: {
            vertical: 'top',
            horizontal: 'left'
          }
        }}
        multiple
        native={false}
        renderValue={(values) => {
          return values.length > 0
            ? values
                .filter((value) => !isCampaignStatus(value))
                .map((value) => {
                  return match(value)
                    .returnType<string>()
                    .with(noCampaignOption.value, () => noCampaignOption.label)
                    .otherwise((value) => {
                      return (
                        props.options.find((option) => option.id === value)
                          ?.title ?? value
                      );
                    });
                })
                .join(', ')
            : 'Toutes';
        }}
        sx={{ width: '100%' }}
        value={selected}
        variant="standard"
        onChange={onChange}
      >
        <MenuItem
          key={noCampaignOption.value}
          value={noCampaignOption.value}
          disableRipple
          dense
        >
          <Checkbox
            classes={{
              root: fr.cx('fr-mb-0'),
              inputGroup: fr.cx('fr-mt-0')
            }}
            options={[
              {
                label: noCampaignOption.label,
                nativeInputProps: {
                  checked: selected.some(
                    (value) => value === noCampaignOption.value
                  ),
                  value: noCampaignOption.value,
                  onClick: (event) => event.stopPropagation(),
                  onChange: (event) => event.stopPropagation()
                }
              }
            ]}
            orientation="vertical"
          />
        </MenuItem>

        {categories.flatMap(([status, campaigns]) => {
          return [
            <MenuItem
              classes={{
                selected: styles.selected
              }}
              sx={{
                position: 'sticky',
                top: 0,
                zIndex: 1,
                backgroundColor:
                  fr.colors.decisions.background.default.grey.default,
                borderTop: `1px solid ${fr.colors.decisions.border.disabled.grey.default}`
              }}
              key={status}
              value={status}
              disableRipple
              dense
            >
              <Checkbox
                classes={{
                  root: fr.cx('fr-mb-0', 'fr-py-2w'),
                  inputGroup: fr.cx('fr-mt-0')
                }}
                options={[
                  {
                    label: (
                      <CampaignStatusBadge status={status as CampaignStatus} />
                    ),
                    nativeInputProps: {
                      checked: selected.some((value) => value === status),
                      value: status,
                      onClick: (event) => event.stopPropagation(),
                      onChange: (event) => event.stopPropagation()
                    }
                  }
                ]}
              />
            </MenuItem>,

            campaigns.map((campaign) => (
              <MenuItem
                key={campaign.id}
                value={campaign.id}
                disableRipple
                dense
              >
                <Checkbox
                  classes={{
                    root: fr.cx('fr-mb-0'),
                    inputGroup: fr.cx('fr-mt-0')
                  }}
                  options={[
                    {
                      label: campaign.title,
                      nativeInputProps: {
                        checked: selected.some(
                          (value) => value === campaign.id
                        ),
                        value: campaign.id,
                        onClick: (event) => event.stopPropagation(),
                        onChange: (event) => event.stopPropagation()
                      }
                    }
                  ]}
                  orientation="vertical"
                />
              </MenuItem>
            ))
          ];
        })}
      </Select>
    </div>
  );
}

function getCampaign(options: ReadonlyArray<Campaign>) {
  return (id: Campaign['id']): Campaign | null => {
    return options.find((option) => option.id === id) ?? null;
  };
}

function groupByStatus(campaigns: ReadonlyArray<Campaign>) {
  return List(campaigns)
    .groupBy((campaign) => campaign.status)
    .map((campaigns) => campaigns.sort(desc(byCreatedAt)))
    .sortBy((_, status) => status, byStatus);
}

export default CampaignFilter;
