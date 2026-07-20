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
