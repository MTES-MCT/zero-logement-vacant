import { createColumnHelper } from '@tanstack/react-table';
import { render, screen, within } from '@testing-library/react';

import AdvancedTable from '~/components/AdvancedTable/AdvancedTable';

interface Row {
  id: string;
  name: string;
}

const columnHelper = createColumnHelper<Row>();
const columns = [columnHelper.accessor('name', { header: 'Nom' })];

function buildRows(count: number): Row[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `row-${i}`,
    name: `Row ${i}`
  }));
}

describe('AdvancedTable', () => {
  it('gives the results-per-page selector an accessible name', async () => {
    render(<AdvancedTable columns={columns} data={buildRows(3)} />);

    await screen.findByRole('table');
    expect(
      screen.getByRole('combobox', { name: 'Résultats par page' })
    ).toBeInTheDocument();
  });

  it('omits aria-selected on rows when selection is disabled', async () => {
    render(<AdvancedTable columns={columns} data={buildRows(2)} />);

    const table = await screen.findByRole('table');
    const bodyRows = within(table).getAllByRole('row').slice(1);
    bodyRows.forEach((row) => {
      expect(row).not.toHaveAttribute('aria-selected');
    });
  });

  it('sets aria-selected on rows when selection is enabled', async () => {
    render(
      <AdvancedTable
        columns={columns}
        data={buildRows(2)}
        selection={{ all: false, ids: [] }}
        onSelectionChange={vi.fn()}
      />
    );

    const table = await screen.findByRole('table');
    const bodyRows = within(table).getAllByRole('row').slice(1);
    bodyRows.forEach((row) => {
      expect(row).toHaveAttribute('aria-selected');
    });
  });
});
