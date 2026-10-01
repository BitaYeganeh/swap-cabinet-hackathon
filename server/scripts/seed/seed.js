// Demo listings for the Team 4 test marketplace.
//
//   SEED_PASSWORD=<test user password> node scripts/seed/seed.js create
//   SEED_PASSWORD=<test user password> node scripts/seed/seed.js close
//
// `create` posts every listing in listings.json that created.json doesn't
// already have, as the "Team 4 Demo Seller" test user (signed up on first
// run). `close` closes every listing in created.json, removing it from search.
// The password is the shared test-user password from the team credentials.
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env"), quiet: true });
const sharetribeSdk = require("sharetribe-flex-sdk");

const { Money, LatLng, UUID } = sharetribeSdk.types;
const LISTINGS = require("./listings.json");
const CREATED_PATH = path.join(__dirname, "created.json");
const created = fs.existsSync(CREATED_PATH)
  ? JSON.parse(fs.readFileSync(CREATED_PATH, "utf8"))
  : { seller: null, listings: {} };
const save = () => fs.writeFileSync(CREATED_PATH, `${JSON.stringify(created, null, 2)}\n`);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Retry rate-limited calls (429) with a growing pause.
async function withRetry(fn, label) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (error.status === 429 && attempt < 8) {
        await sleep(3000 * attempt);
        continue;
      }
      console.error(`Failed to ${label}:`, error.status, JSON.stringify(error.data?.errors || error.message));
      throw error;
    }
  }
}

async function login(sdk, password) {
  if (!created.seller) {
    const email = `team4.demo.seller+${Date.now()}@example.com`;
    await withRetry(
      () =>
        sdk.currentUser.create({
          email,
          password,
          firstName: "Team 4",
          lastName: "Demo Seller",
          displayName: "Team 4 Demo Seller",
        }),
      "sign up the demo seller"
    );
    created.seller = { email };
    save();
    console.log(`Signed up ${email}`);
  }
  await withRetry(() => sdk.login({ username: created.seller.email, password }), "log in");
}

async function create(sdk) {
  for (const listing of LISTINGS.filter((l) => !created.listings[l.key])) {
    const images = [];
    if (listing.photo) {
      const response = await fetch(listing.photo.url);
      if (!response.ok) throw new Error(`Photo download failed (${response.status}): ${listing.photo.url}`);
      // Node's FormData needs a File, not a stream.
      const image = new File([Buffer.from(await response.arrayBuffer())], `${listing.key}.jpg`, { type: "image/jpeg" });
      const upload = await withRetry(() => sdk.images.upload({ image }, { expand: true }), `upload ${listing.key}`);
      images.push(upload.data.data.id);
    }

    const params = {
      title: listing.title,
      description: listing.description,
      publicData: listing.publicData,
      images,
      ...(listing.price && { price: new Money(listing.price.amount, listing.price.currency) }),
      ...(listing.geolocation && { geolocation: new LatLng(listing.geolocation.lat, listing.geolocation.lng) }),
    };
    const response = await withRetry(() => sdk.ownListings.create(params, { expand: true }), `create ${listing.key}`);
    const listingId = response.data.data.id;

    // Items for sale hold one unit of stock so they can be bought.
    if (listing.price) {
      await withRetry(
        () => sdk.stock.compareAndSet({ listingId, oldTotal: null, newTotal: 1 }, { expand: false }),
        `set stock for ${listing.key}`
      );
    }

    created.listings[listing.key] = listingId.uuid;
    save();
    console.log(`Created ${listing.key}: ${listing.title}`);
    await sleep(800);
  }
}

async function close(sdk) {
  for (const [key, uuid] of Object.entries(created.listings)) {
    await withRetry(() => sdk.ownListings.close({ id: new UUID(uuid) }), `close ${key}`);
    console.log(`Closed ${key}`);
    await sleep(500);
  }
}

async function main() {
  const command = process.argv[2];
  const password = process.env.SEED_PASSWORD;
  if (!["create", "close"].includes(command) || !password) {
    console.error("Usage: SEED_PASSWORD=<password> node scripts/seed/seed.js create|close");
    process.exit(1);
  }

  const sdk = sharetribeSdk.createInstance({
    clientId: process.env.SHARETRIBE_CLIENT_ID,
    tokenStore: sharetribeSdk.tokenStore.memoryStore(),
  });
  await login(sdk, password);
  await (command === "create" ? create(sdk) : close(sdk));
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
