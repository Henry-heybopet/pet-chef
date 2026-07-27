# Semantic Localization Contract

Pet Chef calculates safety and nutrition once, then localizes presentation text. Localized text must never be used to decide risk, nutrition, cooking, or device behavior.

## Supported locales

`zh`, `en`, `de`, `fr`, `es`, `it`, `ja`, `ko`. Unsupported values fall back to `zh`.

## Response boundary

Localized Fresh Check and Fresh Match responses keep three layers:

- `semantic`: canonical codes, levels, identifiers, enums, facts, booleans, scores, nutrition values, and cooking parameters. Outside `facts`, free-form strings are excluded by default; only explicit semantic string keys such as `*_code`, `*_id`, `*_level`, `status`, `domain`, and `source` are retained.
- `presentation`: localized `title`, `reason`, and `adjustment` fields keyed by stable `risk_code` order.
- compatibility fields: the existing top-level payload and `findings`, with localized display text but unchanged semantic fields.

Each finding includes:

```json
{
  "risk_code": "FORBIDDEN",
  "risk_level": "danger",
  "ingredient_id": "grape",
  "adjustment_code": "REMOVE_INGREDIENT",
  "facts": { "ingredient_name": "葡萄" }
}
```

## Rendering rules

1. Safety calculation finishes before localization.
2. Human-reviewed templates render safety and allergy codes in all supported locales.
3. Only missing, non-safety, non-danger presentation fields may use the DeepSeek localization fallback.
4. DeepSeek receives only `item_id`, `risk_code`, `title`, `reason`, and `adjustment`. Returned identifiers must match exactly.
5. Numbers and units are replaced with ordered opaque placeholders before AI translation, then restored from canonical text. Empty, malformed, mismatched, failed, dropped, or reordered placeholders keep the canonical Chinese text visible.
6. Localization must not alter codes, levels, identifiers, facts, scores, numeric values, nutrition results, or cooking parameters.
7. A translated safety template is used only when every inserted text fact is localized. Unknown ingredient/allergen text falls back visibly to Chinese instead of producing mixed-language safety advice.

## Re-rendering without re-analysis

Analyze responses include an opaque `analysis_id`. `POST /api/localization/render` accepts `analysis_id`, `kind`, and `locale`, then renders the trusted canonical result without running safety or nutrition rules again. Cache entries are user-bound, flow-bound, process-local, capped at 200 entries, and expire after 15 minutes.

Rendered locale variants are cached with the canonical entry, so toggling back to an already rendered language does not call DeepSeek again. This process-local cache is the intentionally small first deployment shape. It is suitable for the current single backend process. Before horizontal scaling, replace it with the existing shared cache/storage pattern while keeping the same API contract. Expired or restarted entries return `404`; the UI retains the last safe result and can ask the user to run the analysis again.

## Client rules

- Send `locale` with Fresh Check and Fresh Match requests. `lang` remains a temporary backend alias.
- When an open result changes language, call `/api/localization/render`; never resubmit ingredients merely to translate the result.
- Filter and sort by `risk_level`; use `risk_code` for stable keys.
- Display localized fields only. Do not infer business meaning from translated strings.

## Rollback

Disable the `/api/localization/render` call in the client and remove the route-level localization call to return the canonical payload. The deterministic Fresh Check/Fresh Match calculations remain unchanged, and existing clients continue to read the compatibility fields. Restarting the backend clears the process-local localization cache.
