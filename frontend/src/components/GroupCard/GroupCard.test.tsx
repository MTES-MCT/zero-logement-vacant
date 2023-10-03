import { render, screen } from '@testing-library/react';
import GroupCard from './GroupCard';
import { genGroup } from '../../../test/fixtures.test';

describe('GroupCard', () => {
  const group = genGroup();

  it('should render', () => {
    render(<GroupCard group={group} />);

    const title = screen.queryByText(group.title);
    expect(title).toBeVisible();
  });

  it.todo('should show the number of housing');
});
