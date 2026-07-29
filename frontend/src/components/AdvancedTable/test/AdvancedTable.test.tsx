import { createColumnHelper } from '@tanstack/react-table';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

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

describe('AdvancedTable', () => {
  const user = userEvent.setup();

  it('should default to 50 results per page when perPageOptions is not provided', async () => {
    render(<AdvancedTable columns={columns} data={buildRows(3)} />);

    await screen.findByRole('table');
    expect(
      screen.getByDisplayValue('50 résultats par page')
    ).toBeInTheDocument();
  });

  it('should visibly label the results-per-page selector', async () => {
    render(<AdvancedTable columns={columns} data={buildRows(3)} />);

    await screen.findByRole('table');
    expect(
      screen.getByRole('combobox', { name: 'Résultats par page' })
    ).toBeInTheDocument();
    expect(screen.getByText('Résultats par page')).toBeVisible();
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
