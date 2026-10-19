# AVEART — Debito Pay integration

This branch contains the initial Medusa v2 payment provider integration. **Do not enable live payments yet.** The repository has not been built or tested against the merchant's sandbox account, and the storefront redirect plus webhook-to-payment-session reconciliation still need end-to-end validation.

## Render environment variables

Add these to the **Medusa API service** in Render (not Vercel/frontend):

- `DEBITOPAY_API_KEY`: sandbox key first; never commit it or expose it in browser code.
- `DEBITOPAY_MERCHANT_ID`: merchant UUID from Debito Pay Settings → API.
- `DEBITOPAY_WALLET_CODE`: public wallet code for the ZAR / PayFast wallet.
- `DEBITOPAY_API_BASE_URL=https://gyqoaningqhurhvdugne.supabase.co/functions/v1`
- `DEBITOPAY_CURRENCY=ZAR`
- `DEBITOPAY_PAYMENT_METHOD=payfast`
- `DEBITOPAY_RETURN_URL`: HTTPS return page on the actual AVEART storefront. Do not use a guessed URL.
- `DEBITOPAY_WEBHOOK_SECRET`: the webhook signing secret from Debito Pay.

After setting environment variables, trigger a new Render deploy/restart. Do not send credentials in ChatGPT or commit them to GitHub.

## Provider and checkout

The provider ID configured by Medusa is `pp_debitopay_debitopay`. After the provider is registered and enabled in the South Africa region, the payment provider's hosted checkout URL is stored in the payment session's `data.checkout_url`. The storefront must redirect the customer to that URL after initializing the payment session. After the customer returns, the backend must verify the payment by calling Debito Pay's status API; a browser query parameter alone is never proof of payment.

## Webhook configuration

The Medusa payment webhook route for this provider is:

`https://aveart-medusa-api.onrender.com/hooks/payment/debitopay_debitopay`

Configure Debito Pay to send `payment.completed`, `payment.failed`, and `payment.refunded` to this URL, using the same HMAC-SHA256 secret as `DEBITOPAY_WEBHOOK_SECRET`.

The provider verifies the `x-webhook-signature` against the exact raw request body. **Important:** Medusa needs the actual Medusa payment-session ID to apply a webhook event. Debito Pay's documented example event does not include that ID by default. Until a verified mapping from Debito Pay's `payment_id` to the Medusa payment session is implemented and tested, do not rely on webhook events alone to complete orders. The provider also checks payment status server-to-server during authorization.

## Current implementation status

- [x] Provider source and Medusa configuration registration added on this branch.
- [x] Server-side hosted-checkout creation request.
- [x] Server-side payment status query.
- [x] HMAC-SHA256 webhook signature verification using timing-safe comparison.
- [ ] Storefront redirect to `data.checkout_url` and return handling.
- [ ] Reliable webhook mapping from Debito Pay payment ID to Medusa payment-session ID.
- [ ] Automatic refund API integration.
- [ ] Install/build/type-check against Medusa 2.18.0 and resolve any type or runtime issues.
- [ ] Sandbox end-to-end tests: success, decline, duplicate webhook, return without payment, and amount/currency mismatch.
- [ ] Enable the provider in the South African region and verify it appears in Store API.

## Official docs

- Debito Pay API: https://debitopay.com/developers/payments-api/
- Medusa payment providers: https://docs.medusajs.com/resources/commerce-modules/payment/payment-provider
- Medusa payment webhooks: https://docs.medusajs.com/resources/commerce-modules/payment/webhook-events
