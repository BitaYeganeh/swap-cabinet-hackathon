# Search accuracy, speed and cost

Run on 2026-10-02 11:13 UTC against the live marketplace. 11 test searches, right answers picked by hand from all listings.
Model: Claude Opus 5.5 ($4 in / $20 out per million tokens).

## Summary (average over all searches)

| Search | Recall (found all right items) | Precision (shown items are right) | Right items on first page | Time per search |
|---|---|---|---|---|
| Before: Sharetribe keyword search | 84% | 27% | 67% | 0.10 s |
| Our smart keyword search (no AI) | 91% | 39% | 88% | 0.05 s |
| Our AI search | 90% | 54% | 88% | 4.57 s |

## Vague needs only (3 searches)

| Search | Recall | Precision | Right items on first page |
|---|---|---|---|
| Before: Sharetribe keyword search | 76% | 10% | 39% |
| Our smart keyword search (no AI) | 67% | 54% | 63% |
| Our AI search | 100% | 72% | 100% |

## Accuracy per search (recall / precision / items shown)

| Search | Type | Right items | Before (Sharetribe) | Smart (no AI) | AI |
|---|---|---|---|---|---|
| "boots" | plain word | 7 | 100% / 70% / 10 | 100% / 64% / 11 | 86% / 67% / 9 |
| "sneakrs size 38" | typo + size | 1 | 100% / 4% / 23 | 100% / 8% / 13 | 100% / 33% / 3 |
| "farkut" | Finnish word for jeans | 4 | 0% / 0% / 0 | 100% / 40% / 10 | 75% / 33% / 9 |
| "jeans" | plain word | 4 | 100% / 57% / 7 | 100% / 27% / 15 | 75% / 27% / 11 |
| "wool sweater" | material + item | 5 | 100% / 31% / 16 | 100% / 23% / 22 | 100% / 38% / 13 |
| "warm hat" | synonym (beanie) | 2 | 100% / 9% / 22 | 100% / 10% / 21 | 50% / 17% / 6 |
| "kids shoes" | category words | 5 | 100% / 18% / 28 | 100% / 38% / 13 | 100% / 100% / 5 |
| "something to keep me dry in the rain" | vague need | 4 | 50% / 7% / 30 | 50% / 100% / 2 | 100% / 67% / 6 |
| "warm winter clothes for my kid" | vague need | 6 | 100% / 9% / 64 | 83% / 22% / 23 | 100% / 67% / 9 |
| "what to wear to a wedding" | vague need | 9 | 78% / 13% / 52 | 67% / 40% / 15 | 100% / 82% / 11 |
| "leather" | material | 13 | 92% / 75% / 16 | 100% / 59% / 22 | 100% / 59% / 22 |

## AI cost and time per search

| Search | AI mode | Claude calls | Tokens in | Tokens out | Cost | Time (first) | Time (repeat, cached) |
|---|---|---|---|---|---|---|---|
| "boots" | AI filters | 1 | 2703 | 86 | $0.0125 | 2.95 s | 0.04 s |
| "sneakrs size 38" | AI filters | 1 | 2709 | 98 | $0.0128 | 2.72 s | 0.03 s |
| "farkut" | AI filters | 1 | 2704 | 103 | $0.0129 | 6.78 s | 0.03 s |
| "jeans" | AI filters | 1 | 2704 | 89 | $0.0126 | 2.83 s | 0.04 s |
| "wool sweater" | AI filters | 1 | 2706 | 92 | $0.0127 | 3.02 s | 0.06 s |
| "warm hat" | AI filters | 1 | 2705 | 100 | $0.0128 | 2.68 s | 0.04 s |
| "kids shoes" | AI filters | 1 | 2706 | 90 | $0.0126 | 4.57 s | 0.13 s |
| "something to keep me dry in the rain" | AI picks | 2 | 6685 | 338 | $0.0185 | 7.14 s | 0.07 s |
| "warm winter clothes for my kid" | AI picks | 2 | 6704 | 468 | $0.0211 | 7.85 s | 0.06 s |
| "what to wear to a wedding" | AI picks | 2 | 7101 | 492 | $0.0216 | 6.99 s | 0.09 s |
| "leather" | AI filters | 1 | 2703 | 85 | $0.0126 | 2.78 s | 0.05 s |

**Average AI search:** $0.0148 and 4.57 s the first time, 0.06 s when the same search is repeated (cached).
**Per 1,000 searches (no cache hits):** about $14.7909.

## What the AI missed

- "boots": Women's clothing bundle - sweaters, boots & skirt
- "farkut": Kids' jeans & denim jacket bundle, 11y
- "jeans": Kids' jeans & denim jacket bundle, 11y
- "warm hat": Kids winter accessories bundle - hat, scarf & gloves
