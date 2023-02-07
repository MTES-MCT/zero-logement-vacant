import React, {
  ChangeEvent,
  ReactElement,
  ReactNode,
  useEffect,
  useState,
} from 'react';

import {
  Button,
  Link as DSFRLink,
  Pagination,
  Table,
} from '@dataesr/react-dsfr';
import {
  Housing,
  HousingSort,
  HousingSortable,
  SelectedHousing,
} from '../../models/Housing';
import { capitalize } from '../../utils/stringUtils';

import { Link, useLocation } from 'react-router-dom';
import { PaginatedResult } from '../../models/PaginatedResult';
import styles from './housing-list.module.scss';
import { HousingFilters } from '../../models/HousingFilters';
import classNames from 'classnames';
import { useCampaignList } from '../../hooks/useCampaignList';
import { CampaignNumberSort, campaignPartialName } from '../../models/Campaign';
import { getHousingState } from '../../models/HousingState';
import _ from 'lodash';
import {
  TrackEventActions,
  TrackEventCategories,
} from '../../models/TrackEvent';
import { useMatomo } from '@datapunt/matomo-tracker-react';

import HousingListHeader from './HousingListHeader';
import { findChild } from '../../utils/elementUtils';
import Checkbox from '../Checkbox/Checkbox';
import { useSort } from '../../hooks/useSort';
import { usePagination } from '../../hooks/usePagination';

export enum HousingDisplayKey {
  Housing,
  Owner,
}

interface Props {
  actions?: (housing: Housing) => ReactNode | ReactNode[];
  children?: ReactElement | ReactElement[];
  paginatedHousing: PaginatedResult<Housing>;
  displayKind: HousingDisplayKey;
  filters?: HousingFilters;
  onChangePagination: (page: number, perPage: number) => void;
  onSelectHousing?: (selectedHousing: SelectedHousing) => void;
  onSort?: (sort: HousingSort) => void | Promise<void>;
  additionalColumns?: any[];
  tableClassName?: string;
}

const HousingList = ({
  actions,
  children,
  paginatedHousing,
  onChangePagination,
  onSort,
  filters,
  displayKind,
  onSelectHousing,
  additionalColumns,
  tableClassName,
}: Props) => {
  const header = findChild(children, HousingListHeader);

  const location = useLocation();
  const campaignList = useCampaignList();
  const { trackEvent } = useMatomo();

  const { cycleSort, getIcon } = useSort<HousingSortable>({ onSort });

  // Contains unchecked elements if "allChecked" is true
  const [checkedIds, setCheckedIds] = useState<string[]>([]);
  const [allChecked, setAllChecked] = useState<boolean>(false);

  const checkAll = (checked: boolean) => {
    const selectedHousing = { all: checked, ids: [] };
    setAllChecked(selectedHousing.all);
    setCheckedIds(selectedHousing.ids);
    if (onSelectHousing) {
      onSelectHousing(selectedHousing);
    }
  };

  const checkOne = (id: string) => {
    const updatedCheckIds =
      checkedIds.indexOf(id) === -1
        ? [...checkedIds, id]
        : checkedIds.filter((f) => f !== id);
    setCheckedIds(updatedCheckIds);
    if (onSelectHousing) {
      onSelectHousing({ all: allChecked, ids: updatedCheckIds });
    }
  };

  const unselectAll = () => {
    setAllChecked(false);
    setCheckedIds([]);
    onSelectHousing?.({ all: false, ids: [] });
  };

  useEffect(() => {
    if (filters) {
      setAllChecked(false);
      setCheckedIds([]);
      if (onSelectHousing) {
        onSelectHousing({ all: false, ids: [] });
      }
    }
  }, [filters]); //eslint-disable-line react-hooks/exhaustive-deps

  const changePerPage = (perPage: number) => {
    onChangePagination(1, perPage);
  };

  const changePage = (page: number) => {
    onChangePagination(page, paginatedHousing.perPage);
  };

  const { pageCount, rowNumber, hasPagination } =
    usePagination(paginatedHousing);

  const selectColumn = {
    name: 'select',
    headerRender: () => (
      <Checkbox
        onChange={(e: ChangeEvent<any>) => checkAll(e.target.checked)}
        checked={
          (allChecked && checkedIds.length === 0) ||
          (!allChecked && checkedIds.length === paginatedHousing.filteredCount)
        }
        className={checkedIds.length !== 0 ? styles.indeterminate : ''}
        label=""
      ></Checkbox>
    ),
    render: ({ id }: Housing) => (
      <Checkbox
        value={id}
        onChange={(e: ChangeEvent<any>) => checkOne(e.target.value)}
        checked={
          (allChecked && !checkedIds.includes(id)) ||
          (!allChecked && checkedIds.includes(id))
        }
        data-testid={'housing-check-' + id}
        label=""
      ></Checkbox>
    ),
  };

  const rowNumberColumn = {
    name: 'number',
    render: ({ rowNumber }: any) => <>#{rowNumber}</>,
  };

  const addressColumn = {
    name: 'address',
    headerRender: () => (
      <div
        style={{ cursor: 'pointer' }}
        onClick={() => cycleSort('rawAddress')}
      >
        Adresse {getIcon('rawAddress')}
      </div>
    ),
    render: ({ id, rawAddress }: Housing) => (
      <>
        {rawAddress.map((line, lineIdx) => (
          <div key={id + '-rawAddress-' + lineIdx} className="capitalize">
            {capitalize(line)}
          </div>
        ))}
      </>
    ),
  };

  const ownerColumn = {
    name: 'owner',
    headerRender: () => (
      <div style={{ cursor: 'pointer' }} onClick={() => cycleSort('owner')}>
        Propriétaire {getIcon('owner')}
      </div>
    ),
    render: ({ owner }: Housing) => (
      <>
        <DSFRLink
          title={owner.fullName}
          isSimple
          as={<Link to={`/proprietaires/${owner.id}`} />}
        >
          {owner.fullName}
        </DSFRLink>
        {owner.administrator && <div>({owner.administrator})</div>}
      </>
    ),
  };

  const ownerAddressColumn = {
    name: 'ownerAddress',
    label: 'Adresse du propriétaire',
    render: ({ owner }: Housing) => (
      <>
        {owner.rawAddress.map((line, lineIdx) => (
          <div key={owner.id + '-rawAddress-' + lineIdx} className="capitalize">
            {capitalize(line)}
          </div>
        ))}
      </>
    ),
  };

  const campaignColumn = {
    name: 'campaign',
    label: 'Campagne',
    render: ({ campaignIds, id }: Housing) => (
      <>
        {campaignIds?.length > 0 &&
          _.uniq(
            campaignIds
              .map((campaignId) =>
                campaignList?.find((c) => c.id === campaignId)
              )
              .sort(CampaignNumberSort)
              .map((campaign) =>
                campaign ? campaignPartialName(campaign?.campaignNumber) : ''
              )
          ).map((campaignName, campaignIdx) => (
            <div key={id + '-campaign-' + campaignIdx}>{campaignName}</div>
          ))}
      </>
    ),
  };

  const statusColumn = {
    name: 'status',
    label: 'Statut',
    render: ({ status }: Housing) =>
      status != null && (
        <span
          style={{
            backgroundColor: `var(${getHousingState(status).bgcolor})`,
            color: `var(${getHousingState(status).color})`,
          }}
          className="status-label"
        >
          {getHousingState(status).title}
        </span>
      ),
  };

  const actionColumn = {
    name: 'action',
    headerRender: () => '',
    render: (housing: Housing) =>
      actions ? (
        <>{actions(housing)}</>
      ) : (
        <DSFRLink
          display="flex"
          icon="ri-arrow-right-line"
          iconSize="1x"
          iconPosition="right"
          isSimple
          onClick={() =>
            trackEvent({
              category: TrackEventCategories.HousingList,
              action: TrackEventActions.HousingList.DisplayHousing,
            })
          }
          as={<Link to={location.pathname + '/logements/' + housing.id} />}
        >
          Afficher
        </DSFRLink>
      ),
  };

  const columns = () => {
    switch (displayKind) {
      case HousingDisplayKey.Housing:
        return [
          ...(onSelectHousing ? [selectColumn] : []),
          rowNumberColumn,
          addressColumn,
          ownerColumn,
          ownerAddressColumn,
          campaignColumn,
          statusColumn,
          ...(additionalColumns ?? []),
          actionColumn,
        ];
      case HousingDisplayKey.Owner:
        return [
          ...(onSelectHousing ? [selectColumn] : []),
          rowNumberColumn,
          ownerColumn,
          { ...addressColumn, label: 'Logement' },
          campaignColumn,
          ...(additionalColumns ?? []),
          actionColumn,
        ];
    }
  };

  return (
    <div>
      <header>
        <HousingListHeader
          selected={
            allChecked
              ? paginatedHousing.filteredCount - checkedIds.length
              : checkedIds.length
          }
          count={paginatedHousing.filteredCount}
          total={paginatedHousing.totalCount}
          onUnselectAll={unselectAll}
          {...header?.props}
        />
      </header>
      {paginatedHousing.entities?.length > 0 && (
        <>
          <Table
            caption="Logements"
            captionPosition="none"
            rowKey="id"
            data={paginatedHousing.entities.map((_, index) => ({
              ..._,
              rowNumber: rowNumber(index),
            }))}
            columns={columns()}
            fixedLayout={true}
            className={classNames(
              'zlv-table-with-view',
              'with-row-number',
              { 'with-select': onSelectHousing },
              tableClassName
            )}
            data-testid="housing-table"
          />
          {hasPagination && (
            <>
              <div className="fr-react-table--pagination-center nav">
                <Pagination
                  onClick={changePage}
                  currentPage={paginatedHousing.page}
                  pageCount={pageCount}
                />
              </div>
              <div style={{ textAlign: 'center' }}>
                <Button
                  onClick={() => changePerPage(50)}
                  secondary
                  disabled={paginatedHousing.perPage === 50}
                  title="Afficher 50 résultats par page"
                >
                  50 résultats par page
                </Button>
                <Button
                  onClick={() => changePerPage(200)}
                  className="fr-mx-3w"
                  secondary
                  disabled={paginatedHousing.perPage === 200}
                  title="Afficher 200 résultats par page"
                >
                  200 résultats par page
                </Button>
                <Button
                  onClick={() => changePerPage(500)}
                  secondary
                  disabled={paginatedHousing.perPage === 500}
                  title="Afficher 500 résultats par page"
                >
                  500 résultats par page
                </Button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default HousingList;
