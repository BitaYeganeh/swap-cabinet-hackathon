// Live check of the Claude labelling (costs about 2 cents).
// Run from server/: node scripts/tryLabels.js
require("dotenv").config({ quiet: true });
const sharetribe = require("../src/config/sharetribe");
const { labelListing, labelPhoto } = require("../src/vectorStore/labels");

(async () => {
  const res = await sharetribe.listings.query({ perPage: 50, include: ["images"], "fields.image": ["variants.default"] });
  const listing = res.data.data.find((l) => l.relationships.images.data.length);
  const imageId = listing.relationships.images.data[0].id.uuid;
  const image = res.data.included.find((i) => i.id.uuid === imageId);
  const imageUrl = image.attributes.variants.default.url;
  const { title, description, publicData } = listing.attributes;

  console.log("Listing:", title);
  console.log(await labelListing({ title, description, ...publicData, subcategory: publicData.categoryLevel2, imageUrl }));

  const bytes = Buffer.from(await (await fetch(imageUrl)).arrayBuffer());
  console.log("Same photo as a buyer upload:");
  console.log(await labelPhoto(bytes, "image/jpeg"));
  process.exit(0);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
