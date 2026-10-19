# AVEART — Debito Pay configuration

This branch adds the initial Medusa v2 provider scaffold for Debito Pay. It is **not ready for live payments yet**: webhook reconciliation and storefront redirect handling still need to be implemented and tested before merging to the production branch.

## Render environment variables

Copy the variables from `.env.debitopay.example` into the Render service that runs the Medusa API:

- `DEBITOPAY_API_KEY`: secret API key (sandbox first).
- `DEBITOPAY_MERCHANT_ID`: merchant UUID from Debito Pay.
- `DEBITOPAY_WALLET_CODE`: wallet code for the selected currency/method.
- `DEBITOPAY_API_BASE_URL`: leave at the documented API base unless Debito Pay gives the account a different base.
- `DEBITOPAY_CURRENCY=ZAR` and `DEBITOPAY_PAYMENT_METHOD=payfast` for South African sales, only if the merchant wallet has PayFast/ZAR enabled.
- `DEBITOPAY_RETURN_URL`: HTTPS URL on the AVEART storefront that will show the result and verify payment server-side.
- `DEBITOPAY_WEBHOOK_SECRET`: webhook HMAC secret from Debito Pay.

Do not put secret keys in Vercel/frontend environment variables, commit them to GitHub, or send them in chat. After adding or changing variables in Render, trigger a new deploy/restart.

## Debito Pay dashboard

1. Use sandbox credentials for initial tests.
2. Create a webhook pointing to the Medusa webhook handler only after the handler has been implemented and tested. Do not configure the production webhook to an unverified URL.
3. Subscribe to payment completion, failure and refund events.
4. Keep the webhook secret identical between Debito Pay and Render.

## Current implementation status

- [x] Provider module scaffold registered in Medusa configuration.
- [x] Server-side call to Debito Pay's `/payment-orchestrator` for hosted checkout creation.
- [x] Status-query request scaffold.
- [ ] Checkout UI redirect to the returned `data.checkout_url`.
- [ ] Verify HMAC signatures against the exact raw webhook body and support Debito Pay's signature format.
- [ ] Idempotently reconcile gateway events to the correct Medusa payment session/order.
- [ ] Implement/verify refund behavior.
- [ ] Run build and sandbox end-to-end tests before enabling live payments.

## Official documentation

- https://debitopay.com/developers/payments-api/
- https://docs.medusajs.com/resources/commerce-modules/payment/payment-provider
