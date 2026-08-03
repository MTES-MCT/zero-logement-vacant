import { createColumnHelper } from '@tanstack/react-table';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';

import AdvancedTable from '~/components/AdvancedTable/AdvancedTable';

interface Row {
  id: string;
  name: string;
}

const columnHelper = createColumnHelper<Row>();
const columns = [columnHelper.accessor('name', { header: 'Nom' })];

function buildRows(count: number): Row[] {
  return Array.from({ length: count }, (_, i) => ({
    id: String(i),
    name: `Row ${i}`
  }));
}

interface ShrinkingPaginationTableProps {
  pageCountAfterNavigation: number;
}

function ShrinkingPaginationTable(
  props: Readonly<ShrinkingPaginationTableProps>
) {
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 1
  });
  const [hasNavigated, setHasNavigated] = useState(false);
  const pageCount = hasNavigated ? props.pageCountAfterNavigation : 2;

  return (
    <AdvancedTable
      columns={columns}
      data={pageCount > 0 ? buildRows(1) : []}
      manualPagination
      pageCount={pageCount}
      state={{ pagination }}
      onPaginationChange={(updater) => {
        setHasNavigated(true);
        setPagination(updater);
      }}
    />
  );
}

describe('AdvancedTable', () => {
  const user = userEvent.setup();

  it('should default to 50 results per page when perPageOptions is not provided', async () => {
    render(<AdvancedTable columns={columns} data={buildRows(3)} />);

    await screen.findByRole('table');
    expect(
      screen.getByDisplayValue('50 résultats par page')
    ).toBeInTheDocument();
  });

  it('should label the results-per-page selector without visible text', async () => {
    render(<AdvancedTable columns={columns} data={buildRows(3)} />);

    await screen.findByRole('table');
    const selector = screen.getByRole('combobox', {
      name: 'Résultats par page'
    });
    expect(selector).toHaveAttribute('title', 'Résultats par page');
    expect(screen.queryByText('Résultats par page')).not.toBeInTheDocument();
  });

  it('should not expose row-selection state when selection is disabled', async () => {
    render(<AdvancedTable columns={columns} data={buildRows(2)} />);

    const table = await screen.findByRole('table');
    const bodyRows = within(table).getAllByRole('row').slice(1);
    bodyRows.forEach((row) => {
      expect(row).not.toHaveAttribute('aria-selected');
    });
  });

  it('should hide pagination controls when there are no results', async () => {
    render(<AdvancedTable columns={columns} data={[]} />);

    await screen.findByRole('table');
    expect(
      screen.queryByRole('navigation', { name: 'Pagination' })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('combobox', { name: 'Résultats par page' })
    ).not.toBeInTheDocument();
  });

  it('should show pagination controls when there is one result', async () => {
    render(<AdvancedTable columns={columns} data={buildRows(1)} />);

    await screen.findByRole('table');
    expect(
      screen.getByRole('navigation', { name: 'Pagination' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('combobox', { name: 'Résultats par page' })
    ).toBeInTheDocument();
  });

  it('should preserve focus when pagination disappears after navigation', async () => {
    render(<ShrinkingPaginationTable pageCountAfterNavigation={0} />);
    const table = await screen.findByRole('table');
    const nextPageLink = screen.getByRole('link', { name: 'Page suivante' });

    nextPageLink.focus();
    await user.click(nextPageLink);

    expect(
      screen.queryByRole('navigation', { name: 'Pagination' })
    ).not.toBeInTheDocument();
    expect(table).toHaveFocus();
  });

  it('should focus the last available page when the current page disappears', async () => {
    render(<ShrinkingPaginationTable pageCountAfterNavigation={1} />);
    const nextPageLink = await screen.findByRole('link', {
      name: 'Page suivante'
    });

    nextPageLink.focus();
    await user.click(nextPageLink);

    await waitFor(() => {
      expect(screen.getByTitle('Page 1')).toHaveFocus();
    });
  });

  it('should render every row when pagination is disabled', async () => {
    render(
      <AdvancedTable columns={columns} data={buildRows(75)} paginate={false} />
    );

    const table = await screen.findByRole('table');
    expect(within(table).getAllByRole('row')).toHaveLength(76);
    expect(
      screen.queryByRole('navigation', { name: 'Pagination' })
    ).not.toBeInTheDocument();
  });

  it('should render every row after pagination is disabled', async () => {
    const { rerender } = render(
      <AdvancedTable columns={columns} data={buildRows(75)} />
    );
    const table = await screen.findByRole('table');
    expect(within(table).getAllByRole('row')).toHaveLength(51);

    rerender(
      <AdvancedTable columns={columns} data={buildRows(75)} paginate={false} />
    );

    expect(within(table).getAllByRole('row')).toHaveLength(76);
    expect(
      screen.queryByRole('navigation', { name: 'Pagination' })
    ).not.toBeInTheDocument();
  });

  it('should use a custom default page size and per-page options', async () => {
    render(
      <AdvancedTable
        columns={columns}
        data={buildRows(7)}
        perPageOptions={[5, 10, 50]}
        defaultPageSize={5}
      />
    );

    const table = await screen.findByRole('table');
    expect(
      screen.getByDisplayValue('5 résultats par page')
    ).toBeInTheDocument();
    // 1 header row + 5 data rows
    expect(within(table).getAllByRole('row')).toHaveLength(6);

    const select = screen.getByDisplayValue('5 résultats par page');
    await user.selectOptions(select, '10');

    // 1 header row + remaining 7 data rows (only 7 total)
    expect(within(table).getAllByRole('row')).toHaveLength(8);
  });
});
