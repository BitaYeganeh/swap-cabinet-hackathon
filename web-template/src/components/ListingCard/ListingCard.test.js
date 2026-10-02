import React from 'react';
import '@testing-library/jest-dom';

import { getHostedConfiguration, renderWithProviders as render } from '../../util/testHelpers';
import { createUser, createListing, fakeIntl } from '../../util/testData';

import { ListingCard } from './ListingCard';

const getConfig = () => {
  const hostedConfig = getHostedConfiguration();
  return {
    ...hostedConfig,
    listingTypes: {
      listingTypes: [
        {
          id: 'free-inquiry',
          transactionProcess: {
            name: 'default-inquiry',
            alias: 'default-inquiry/release-1',
          },
          unitType: 'inquiry',
          defaultListingFields: {
            price: false,
          },
        },
      ],
    },
  };
};

describe('ListingCard', () => {
  it('matches snapshot', () => {
    // This is quite small component what comes to rendered HTML
    // For now, we rely on snapshot-testing.
    const listing = createListing('listing1', {}, { author: createUser('user1') });
    const tree = render(<ListingCard listing={listing} intl={fakeIntl} />);
    expect(tree.asFragment().firstChild).toMatchSnapshot();
  });

  it('matches snapshot without price', () => {
    const config = getConfig();
    const listing = createListing(
      'listing1',
      { publicData: { listingType: 'free-inquiry' } },
      { author: createUser('user1') }
    );
    const tree = render(<ListingCard listing={listing} intl={fakeIntl} />, { config });
    expect(tree.asFragment().firstChild).toMatchSnapshot();
  });

  it('shows the AI reason only when given', () => {
    const listing = createListing('listing1', {}, { author: createUser('user1') });
    const withReason = render(
      <ListingCard listing={listing} intl={fakeIntl} reason="Waterproof shell" />
    );
    expect(withReason.getByText('Waterproof shell')).toBeInTheDocument();
    withReason.unmount();

    const without = render(<ListingCard listing={listing} intl={fakeIntl} />);
    expect(without.container.querySelector('[title="Why the AI picked this"]')).toBeNull();
  });

  it('shows a Wanted badge instead of the price for buyer requests', () => {
    const wanted = createListing(
      'listing1',
      { title: 'Looking for black boots', publicData: { listingType: 'in-search-of-clothing' } },
      { author: createUser('user1') }
    );
    const w = render(<ListingCard listing={wanted} intl={fakeIntl} />);
    expect(w.getAllByText('Wanted')).toHaveLength(2);
    w.unmount();

    const normal = createListing('listing2', {}, { author: createUser('user1') });
    const n = render(<ListingCard listing={normal} intl={fakeIntl} />);
    expect(n.queryByText('Wanted')).toBeNull();
  });
});
