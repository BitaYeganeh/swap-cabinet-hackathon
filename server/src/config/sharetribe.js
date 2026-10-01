const sharetribeSdk = require("sharetribe-flex-sdk");

// Marketplace API (public listing search). The client ID in .env belongs to
// a Marketplace API application, so the Integration SDK returns 403 Forbidden.
const sharetribe = sharetribeSdk.createInstance({
  clientId: process.env.SHARETRIBE_CLIENT_ID,
  tokenStore: sharetribeSdk.tokenStore.memoryStore(),
});

module.exports = sharetribe;
