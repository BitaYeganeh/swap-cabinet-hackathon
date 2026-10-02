const test = require("node:test");
const assert = require("node:assert/strict");
const { imageVector, clipTextVector, textVector } = require("../src/vectorStore/embed");

const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
const SNEAKER_PHOTO = "https://images.unsplash.com/photo-1607522370275-f14206abe5d3?w=400";

test("CLIP puts a sneaker photo closer to 'sneakers' than to 'sweater'", { timeout: 600_000 }, async () => {
  const photo = await imageVector(SNEAKER_PHOTO);
  assert.equal(photo.length, 512);
  assert.ok(Math.abs(dot(photo, photo) - 1) < 1e-4);
  const sneaker = await clipTextVector("a photo of sneakers");
  const sweater = await clipTextVector("a photo of a wool sweater");
  assert.ok(dot(photo, sneaker) > dot(photo, sweater));
});

test("image bytes give the same vector as the URL", { timeout: 600_000 }, async () => {
  const bytes = Buffer.from(await (await fetch(SNEAKER_PHOTO)).arrayBuffer());
  const fromBytes = await imageVector(bytes);
  const fromUrl = await imageVector(SNEAKER_PHOTO);
  assert.ok(dot(fromBytes, fromUrl) > 0.99);
});

test("text vectors match by meaning, also in Finnish", { timeout: 600_000 }, async () => {
  const query = await textVector("vintage jacket for autumn");
  const bomber = await textVector("Bronze bomber jacket L");
  const flipflops = await textVector("Green flip-flops, kids");
  assert.equal(query.length, 384);
  assert.ok(dot(query, bomber) > dot(query, flipflops));
  const fi = await textVector("takki syksyksi");
  assert.ok(dot(fi, bomber) > dot(fi, flipflops));
});
