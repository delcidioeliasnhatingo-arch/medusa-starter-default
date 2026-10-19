import { createHmac, timingSafeEqual } from "node:crypto"
import type {
  ProviderWebhookPayload,
  WebhookActionResult,
} from "@medusajs/framework/types"
import {
  AbstractPaymentProvider,
  BigNumber,
  MedusaError,
  PaymentActions,
} from "@medusajs/framework/utils"

type Options = {
  apiKey?: string
  merchantId?: string
  walletCode?: string
  apiBaseUrl?: string
  currency?: string
  paymentMethod?: string
  returnUrl?: string
  webhookSecret?: string
}

type GatewayResponse = {
  success?: boolean
  payment_id?: string
  payment_method?: string
  status?: string
  checkout_url?: string
  reference?: string
  payment?: {
    id?: string
    status?: string
    provider_reference?: string
    amount?: number
    currency?: string
  }
  message?: string
  error?: string
}

type WebhookEvent = {
  event?: string
  timestamp?: string
  data?: {
    payment_id?: string
    session_id?: string
    source_id?: string
    status?: string
    amount?: number
    currency?: string
    merchant_id?: string
    wallet_code?: string
  }
}

class DebitoPayProviderService extends AbstractPaymentProvider<Options> {
  static identifier = "debitopay"
  protected options_: Options

  constructor(container: Record<string, unknown>, options: Options) {
    super(container, options)
    this.options_ = {
      apiBaseUrl: "https://gyqoaningqhurhvdugne.supabase.co/functions/v1",
      currency: "ZAR",
      paymentMethod: "payfast",
      ...options,
    }
  }

  static validateOptions(options: Options) {
    if (!options.apiKey || !options.merchantId || !options.walletCode) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Debito Pay requires DEBITOPAY_API_KEY, DEBITOPAY_MERCHANT_ID and DEBITOPAY_WALLET_CODE."
      )
    }
  }

  private async request(path: string, body: Record<string, unknown>): Promise<GatewayResponse> {
    const response = await fetch(`${this.options_.apiBaseUrl}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.options_.apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    })
    const payload = (await response.json().catch(() => ({}))) as GatewayResponse
    if (!response.ok || payload.success === false) {
      throw new MedusaError(
        MedusaError.Types.PAYMENT_AUTHORIZATION_FAILED,
        payload.message || payload.error || `Debito Pay API returned HTTP ${response.status}`
      )
    }
    return payload
  }

  private async checkStatus(paymentId: string): Promise<string> {
    const result = await this.request("/payment-orchestrator", {
      action: "check-status",
      payment_id: paymentId,
    })
    return String(result.payment?.status || result.status || "pending").toLowerCase()
  }

  async initiatePayment(input: any): Promise<any> {
    const currency = String(input.currency_code || this.options_.currency || "ZAR").toUpperCase()
    if (currency !== "ZAR") {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "This AVEART Debito Pay configuration is for ZAR payments only. Configure a separate wallet/provider for another currency."
      )
    }

    const paymentMethod = this.options_.paymentMethod || "payfast"
    if (paymentMethod !== "payfast") {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "For ZAR, Debito Pay payment_method must be payfast.")
    }

    const context = input.context || {}
    const customer = context.customer || {}
    const email = customer.email || input.data?.customer_email
    const name = [customer.first_name, customer.last_name].filter(Boolean).join(" ") || input.data?.customer_name
    const amount = Number(input.amount?.numeric ?? input.amount)

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "Debito Pay received an invalid payment amount.")
    }
    if (!email) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "Customer email is required for Debito Pay checkout.")
    }
    if (!this.options_.returnUrl) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "Set DEBITOPAY_RETURN_URL in Render before enabling checkout.")
    }

    const sourceId = String(
      input.data?.session_id ||
      input.data?.cart_id ||
      context.resource_id ||
      `aveart-${Date.now()}`
    )

    const result = await this.request("/payment-orchestrator", {
      action: "process",
      payment_method: paymentMethod,
      merchant_id: this.options_.merchantId,
      wallet_code: this.options_.walletCode,
      amount,
      currency,
      source: "aveart-medusa",
      source_id: sourceId,
      customer_email: email,
      customer_name: name || "AVEART customer",
      customer_phone: customer.phone || input.data?.customer_phone,
      return_url: this.options_.returnUrl,
    })

    const paymentId = result.payment_id || result.payment?.id
    if (!result.success || !paymentId || !result.checkout_url) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "Debito Pay did not return a valid payment ID and hosted checkout URL."
      )
    }

    return {
      id: paymentId,
      status: "pending",
      data: {
        ...(input.data || {}),
        provider: "debitopay",
        payment_id: paymentId,
        payment_method: result.payment_method || paymentMethod,
        checkout_url: result.checkout_url,
        gateway_status: result.status || "pending",
        currency,
        source_id: sourceId,
      },
    }
  }

  async authorizePayment(input: any): Promise<any> {
    const data = input.data || {}
    if (!data.payment_id) {
      throw new MedusaError(MedusaError.Types.PAYMENT_AUTHORIZATION_FAILED, "Debito Pay payment session has no payment_id.")
    }

    // Never trust the browser return URL as proof of payment. Verify status server-to-server.
    const status = await this.checkStatus(String(data.payment_id))
    if (["success", "completed", "paid"].includes(status)) {
      return { status: "authorized", data: { ...data, gateway_status: status } }
    }
    if (["failed", "expired", "cancelled"].includes(status)) {
      throw new MedusaError(MedusaError.Types.PAYMENT_AUTHORIZATION_FAILED, `Debito Pay payment status is ${status}.`)
    }

    throw new MedusaError(
      MedusaError.Types.PAYMENT_AUTHORIZATION_FAILED,
      "Debito Pay payment is not confirmed yet. Complete payment and retry checkout."
    )
  }

  async getPaymentStatus(input: any): Promise<any> {
    const paymentId = input.data?.payment_id || input.payment_id
    if (!paymentId) return { status: "pending" }
    const status = await this.checkStatus(String(paymentId))
    if (["success", "completed", "paid"].includes(status)) return { status: "authorized" }
    if (["failed", "expired", "cancelled"].includes(status)) return { status: "error" }
    return { status: "pending" }
  }

  async capturePayment(input: any): Promise<any> {
    return { data: { ...(input.data || {}) } }
  }

  async cancelPayment(input: any): Promise<any> {
    return { data: { ...(input.data || {}), cancellation_requested: true } }
  }

  async deletePayment(input: any): Promise<any> {
    return { data: { ...(input.data || {}) } }
  }

  async refundPayment(_input: any): Promise<any> {
    throw new MedusaError(
      MedusaError.Types.NOT_SUPPORTED,
      "Refunds are not implemented through this provider yet. Do not promise automatic refunds; reconcile refunds in Debito Pay and Medusa manually."
    )
  }

  async retrievePayment(input: any): Promise<any> {
    return { data: { ...(input.data || {}) } }
  }

  async updatePayment(input: any): Promise<any> {
    return { data: { ...(input.data || {}) } }
  }

  async getWebhookActionAndData(
    payload: ProviderWebhookPayload["payload"]
  ): Promise<WebhookActionResult> {
    const rawBody = Buffer.isBuffer(payload.rawData)
      ? payload.rawData.toString("utf8")
      : String(payload.rawData || "")
    const signatureValue = payload.headers?.["x-webhook-signature"]
    const signature = Array.isArray(signatureValue) ? String(signatureValue[0] || "") : String(signatureValue || "")
    const secret = this.options_.webhookSecret

    const fail = (): WebhookActionResult => ({
      action: PaymentActions.FAILED,
      data: { session_id: "", amount: new BigNumber(0) },
    })

    if (!secret || !signature || !rawBody) return fail()

    const expected = createHmac("sha256", secret).update(rawBody).digest("hex")
    const provided = signature.startsWith("sha256=") ? signature.slice(7) : signature
    const expectedBuffer = Buffer.from(expected, "hex")
    const providedBuffer = Buffer.from(provided, "hex")
    if (
      expectedBuffer.length !== providedBuffer.length ||
      !timingSafeEqual(expectedBuffer, providedBuffer)
    ) return fail()

    let event: WebhookEvent
    try {
      event = JSON.parse(rawBody) as WebhookEvent
    } catch {
      return fail()
    }

    const eventType = String(event.event || "")
    const eventData = event.data || {}
    const paymentId = eventData.payment_id
    const sessionId = eventData.session_id ||
      (eventData.source_id?.startsWith("payses_") ? eventData.source_id : undefined)

    // The gateway must send the Medusa payment session ID as session_id/source_id.
    // A cart ID is not a payment session ID, so never mark a payment successful by guessing.
    if (!paymentId || !sessionId) {
      return {
        action: PaymentActions.NOT_SUPPORTED,
        data: { session_id: "", amount: new BigNumber(0) },
      }
    }

    if (["payment.completed"].includes(eventType)) {
      return {
        action: PaymentActions.CAPTURED,
        data: { session_id: sessionId, amount: new BigNumber(Number(eventData.amount || 0)) },
      }
    }

    if (["payment.failed"].includes(eventType)) {
      return {
        action: PaymentActions.FAILED,
        data: { session_id: sessionId, amount: new BigNumber(Number(eventData.amount || 0)) },
      }
    }

    // Refund notifications are acknowledged as unsupported until Medusa refund reconciliation is implemented.
    return {
      action: PaymentActions.NOT_SUPPORTED,
      data: { session_id: sessionId, amount: new BigNumber(Number(eventData.amount || 0)) },
    }
  }
}

export default DebitoPayProviderService
