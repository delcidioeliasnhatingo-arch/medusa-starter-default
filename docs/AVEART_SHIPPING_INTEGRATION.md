# AVEART — South Africa freight integration

## Included in this change

- Medusa store endpoint: `POST /store/aveart-shipping/quote`.
- Public tariff endpoint: `GET /store/aveart-shipping/tariffs` returns AVEART Economy R120, Standard R180, Express R300 and a special-delivery quote-required tier.
- Server-side call to Shiplogic / The Courier Guy rates API.
- Validates collection and delivery addresses in South Africa and parcel weight/dimensions.
- Returns normalized carrier services sorted by the quoted ZAR price.
- Keeps the API token server-side and does not expose raw provider errors.
- Quotes only: does not book shipments, create labels, charge customers, or change product prices.

## AVEART customer-facing tariffs

The initial storefront tariff table is:

| Method | Customer price |
|---|---:|
| AVEART Economy | R120 |
| AVEART Standard | R180 |
| AVEART Express | R300 |
| Remote, bulky or special delivery | From R300, confirm route before charging |

These are initial commercial prices chosen by AVEART, not verified carrier prices or guaranteed delivery promises. The frontend checkout uses the same R120/R180/R300 tariffs and the backend calculation remains authoritative for order totals. Do not advertise a guaranteed delivery time or coverage until carrier costs and route eligibility are confirmed.

The public tariff list is available at:

`GET https://aveart-medusa-api.onrender.com/store/aveart-shipping/tariffs`

For a store API request, include the Medusa publishable key header when required by the deployment.

## Render configuration

Add this environment variable to the existing `aveart-medusa-api` service after obtaining an authorized API token from Shiplogic / The Courier Guy:

```env
SHIPLOGIC_API_TOKEN=<your-private-carrier-api-token>
```

Do not commit the token, send it in chat, or expose it through a frontend variable. The service deliberately returns `503 shipping_provider_not_configured` when no token is set.

## Example request

```json
{
  "collection_address": {
    "street_address": "10 Example Road",
    "local_area": "Kya Sand",
    "city": "Randburg",
    "zone": "GP",
    "country": "ZA",
    "code": "2163",
    "type": "business"
  },
  "delivery_address": {
    "street_address": "20 Example Street",
    "local_area": "Gardens",
    "city": "Cape Town",
    "zone": "WC",
    "country": "ZA",
    "code": "8001",
    "type": "residential"
  },
  "parcels": [
    {
      "submitted_length_cm": 30,
      "submitted_width_cm": 25,
      "submitted_height_cm": 5,
      "submitted_weight_kg": 0.6,
      "parcel_description": "Clothing"
    }
  ],
  "declared_value": 250
}
```

```bash
curl -X POST "https://aveart-medusa-api.onrender.com/store/aveart-shipping/quote" \
  -H "Content-Type: application/json" \
  -H "x-publishable-api-key: YOUR_MEDUSA_PUBLISHABLE_KEY" \
  --data @quote-test.json
```

## Freight-included product prices

AVEART's chosen customer-facing model is to include an estimated shipping allowance in product prices. The carrier quote changes with supplier origin, delivery area, parcel dimensions/weight and service. The live quote endpoint must not be used as a product-price updater without a pricing policy.

Before safely updating catalog prices:
1. Capture each supplier's actual South African collection address/postal code.
2. Record each SKU's packed weight and packed dimensions, not just garment weight.
3. Quote a representative set of South African destinations for each supplier/parcel profile.
4. Calculate a documented national weighted average or conservative percentile, including applicable surcharges and VAT treatment.
5. Set a minimum margin and a review interval, then update product prices in a separate, auditable batch.
6. Avoid double-charging shipping at checkout. For mixed-supplier carts, decide how split parcels and costs are allocated.

## Activation and verification checklist

- [ ] Obtain a valid Shiplogic / The Courier Guy API token.
- [ ] Add `SHIPLOGIC_API_TOKEN` in Render service environment.
- [ ] Deploy this branch to the service connected to `delcidioeliasnhatingo-arch/medusa-starter-default`.
- [ ] Test a real quote using a real supplier address and representative destination.
- [ ] Verify rate fields and VAT treatment against the carrier response.
- [ ] Gather supplier addresses and actual packed dimensions/weights.
- [ ] Approve the freight-included pricing rule before changing live prices.

The token, supplier origins and package measurements are external inputs; no carrier price or supplier address is fabricated by this integration.
