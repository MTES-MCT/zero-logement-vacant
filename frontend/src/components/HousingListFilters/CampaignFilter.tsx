import { fr } from '@codegouvfr/react-dsfr';
import Checkbox from '@codegouvfr/react-dsfr/Checkbox';
import { MenuItem, Select, SelectChangeEvent } from '@mui/material';
import { ChangeEvent, useId, useRef } from 'react';
import { useList } from 'react-use';

import { Campaign } from '../../models/Campaign';
import { CampaignStatus, isCampaignStatus } from '@zerologementvacant/models';
import fp from 'lodash/fp';
import CampaignStatusBadge from '../Campaign/CampaignStatusBadge';

interface Props {
  campaigns: ReadonlyArray<Campaign>;
}

function CampaignFilter(props: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [values, { set: setValues, filter: filterValues }] =
    useList<Campaign>();

  const labelId = `fr-label-${useId()}`;
  const selectId = `fr-select-${useId()}`;

  function onChange(
    event: SelectChangeEvent<ReadonlyArray<Campaign | CampaignStatus>>
  ): void {
    if (Array.isArray(event.target.value)) {
      const status: Campaign | CampaignStatus | null =
        fp.last(event.target.value) ?? null;

      if (!isCampaignStatus(status)) {
        // Select a campaign
        setValues(
          event.target.value.filter((value) => !isCampaignStatus(value))
        );
        return;
      }

      if (allSelected(status)) {
        // Unselect everything
        filterValues((value) => value.status !== status);
      } else {
        // Select everything
        setValues(
          values
            .filter((value) => value.status !== status)
            .concat(
              props.campaigns.filter((campaign) => campaign.status === status)
            )
        );
      }
    }
  }

  function allSelected(status: CampaignStatus): boolean {
    return (
      values.filter((value) => value.status === status).length ===
      props.campaigns.filter((campaign) => campaign.status === status).length
    );
  }

  function noop(event: ChangeEvent): void {
    event.stopPropagation();
  }

  const categories = groupByStatus(props.campaigns);

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
        renderValue={(values) =>
          values.length > 0
            ? values.map((value) => value.title).join(', ')
            : 'Toutes'
        }
        sx={{ width: '100%' }}
        value={values}
        variant="standard"
        onChange={onChange}
      >
        {Object.entries(categories).flatMap(([status, campaigns]) => {
          return [
            <MenuItem
              sx={{
                position: 'sticky',
                top: 0,
                zIndex: 1,
                backgroundColor:
                  fr.colors.decisions.background.default.grey.default
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
                      checked: allSelected(status as CampaignStatus),
                      value: status,
                      onClick: noop,
                      onChange: noop
                    }
                  }
                ]}
              />
            </MenuItem>,

            campaigns.map((campaign) => (
              // @ts-expect-error: MenuItem expects a string value but it can be anything
              <MenuItem key={campaign.id} value={campaign} disableRipple dense>
                <Checkbox
                  classes={{
                    root: fr.cx('fr-mb-0'),
                    inputGroup: fr.cx('fr-mt-0')
                  }}
                  options={[
                    {
                      label: campaign.title,
                      nativeInputProps: {
                        checked: values.some(
                          (value) => value.id === campaign.id
                        ),
                        value: campaign,
                        onClick: noop,
                        onChange: noop
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

function groupByStatus(
  campaigns: ReadonlyArray<Campaign>
): Record<CampaignStatus, ReadonlyArray<Campaign>> {
  return fp.groupBy((campaign) => campaign.status, campaigns) as Record<
    CampaignStatus,
    Campaign[]
  >;
}

export default CampaignFilter;
