const path = require("path");
const {
  env,
  pipeline,
  AutoProcessor,
  AutoTokenizer,
  CLIPVisionModelWithProjection,
  CLIPTextModelWithProjection,
  RawImage,
} = require("@huggingface/transformers");

// Models run locally (free). Downloaded once, then cached here.
env.cacheDir = path.join(__dirname, "../data/models");

const CLIP_ID = "Xenova/clip-vit-base-patch32";
const TEXT_ID = "Xenova/paraphrase-multilingual-MiniLM-L12-v2";
const OPTIONS = { dtype: "q8" };

let clipPromise = null;
let textPromise = null;

// Loaded on first use; a failed load is retried on the next call.
function once(load, reset) {
  const promise = load();
  promise.catch(reset);
  return promise;
}

function clip() {
  clipPromise ??= once(
    async () => {
      const [processor, vision, tokenizer, text] = await Promise.all([
        AutoProcessor.from_pretrained(CLIP_ID),
        CLIPVisionModelWithProjection.from_pretrained(CLIP_ID, OPTIONS),
        AutoTokenizer.from_pretrained(CLIP_ID),
        CLIPTextModelWithProjection.from_pretrained(CLIP_ID, OPTIONS),
      ]);
      return { processor, vision, tokenizer, text };
    },
    () => (clipPromise = null)
  );
  return clipPromise;
}

function textModel() {
  textPromise ??= once(() => pipeline("feature-extraction", TEXT_ID, OPTIONS), () => (textPromise = null));
  return textPromise;
}

function normalize(values) {
  const length = Math.hypot(...values) || 1;
  return Array.from(values, (x) => x / length);
}

async function imageVector(input) {
  const { processor, vision } = await clip();
  const image = typeof input === "string" ? await RawImage.fromURL(input) : await RawImage.fromBlob(new Blob([input]));
  const { image_embeds } = await vision(await processor(image));
  return normalize(image_embeds.data);
}

async function clipTextVector(text) {
  const { tokenizer, text: model } = await clip();
  const { text_embeds } = await model(tokenizer([text], { padding: true, truncation: true }));
  return normalize(text_embeds.data);
}

async function textVector(text) {
  const output = await (await textModel())(text, { pooling: "mean", normalize: true });
  return Array.from(output.data);
}

module.exports = { imageVector, clipTextVector, textVector };
