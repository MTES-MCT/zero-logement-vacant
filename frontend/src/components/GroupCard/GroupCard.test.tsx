import { render, screen } from '@testing-library/react';
import GroupCard from './GroupCard';
import { genGroup } from '../../../test/fixtures.test';
import { Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';

describe('GroupCard', () => {
  const group = genGroup();

  it('should render', () => {
    render(
      <Router history={createMemoryHistory()}>
        <GroupCard group={group} />
      </Router>
    );

    const title = screen.queryByText(group.title);
    expect(title).toBeVisible();
  });

  it('should show the number of housing', () => {
    render(
      <Router history={createMemoryHistory()}>
        <GroupCard group={group} />
      </Router>
    );

    const housingCount = screen.queryByText(group.housingCount);
    expect(housingCount).toBeVisible();
  });

  it('should show the number of owners', () => {
    render(
      <Router history={createMemoryHistory()}>
        <GroupCard group={group} />
      </Router>
    );

    const ownerCount = screen.queryByText(group.ownerCount);
    expect(ownerCount).toBeVisible();
  });

  it('should have a link that redirects to the group view', () => {
    render(
      <Router history={createMemoryHistory()}>
        <GroupCard group={group} />
      </Router>
    );

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href');
  });
});
