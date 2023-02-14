import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import Collapse from './Collapse';

describe('Collapse', () => {
  const user = userEvent.setup();

  it('should render', async () => {
    render(<Collapse title="Title" content="Content" />);

    const title = screen.queryByText('Title');
    expect(title).toBeVisible();
    const content = screen.queryByText('Content');
    expect(content).toBeNull();
  });

  it('should show content if defaultCollapse is false', () => {
    render(
      <Collapse defaultCollapse={false} title="Title" content="Content" />
    );

    const content = screen.getByText('Content');
    expect(content).toBeVisible();
  });

  it('should show content on header click', async () => {
    render(<Collapse title="Title" content="Content" />);

    const title = screen.getByText('Title');
    await user.click(title);
    const content = screen.getByText('Content');
    expect(content).toBeVisible();
  });
});
