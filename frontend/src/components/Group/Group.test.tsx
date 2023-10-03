import Group from './Group';
import { render, screen } from '@testing-library/react';
import { genGroup } from '../../../test/fixtures.test';

describe('Group', () => {
  const group = genGroup();

  it('should render', () => {
    render(<Group group={group} />);

    const title = screen.queryByText(group.title);
    expect(title).toBeVisible();

    const descriptionLabel = screen.queryByText('Description');
    expect(descriptionLabel).toBeVisible();
    const description = screen.queryByText(group.description);
    expect(description).toBeVisible();
  });
});
