const sharetribeSdk = require('sharetribe-flex-sdk');

// Anonymous Marketplace API instance (the buyer's view), for the module's own
// background queries: counting results and fetching listings to sync.
const baseUrlMaybe = process.env.REACT_APP_SHARETRIBE_SDK_BASE_URL
  ? { baseUrl: process.env.REACT_APP_SHARETRIBE_SDK_BASE_URL }
  : {};

const sdk = sharetribeSdk.createInstance({
  clientId: process.env.REACT_APP_SHARETRIBE_SDK_CLIENT_ID,
  tokenStore: sharetribeSdk.tokenStore.memoryStore(),
  ...baseUrlMaybe,
});

module.exports = sdk;
