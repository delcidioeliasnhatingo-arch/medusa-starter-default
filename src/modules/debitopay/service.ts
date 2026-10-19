import {
  AbstractPaymentProvider,
  MedusaError,
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

  async initiatePayment(input: any): Promise<any> {
    const currency = String(input.currency_code || this.options_.currency || "ZAR").toUpperCase()
    const paymentMethod = currency === "ZAR" ? (this.options_.paymentMethod || "payfast") : "visa_mastercard"
    const context = input.context || {}
    const customer = context.customer || {}
    const email = context.email || customer.email || input.data?.customer_email
    const name = [customer.first_name, customer.last_name].filter(Boolean).join(" ") || input.data?.customer_name
    const amount = Number(input.amount)

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "Debito Pay received an invalid payment amount.")
    }
    if (!email) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "Customer email is required for Debito Pay checkout.")
    }
    if (!this.options_.returnUrl) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "Set DEBITOPAY_RETURN_URL in Render before enabling checkout.")
    }

    const result = await this.request("/payment-orchestrator", {
      action: "process",
      payment_method: paymentMethod,
      merchant_id: this.options_.merchantId,
      wallet_code: this.options_.walletCode,
      amount,
      currency,
      source: "aveart-medusa",
      source_id: String(input.data?.cart_id || input.context?.id || `aveart-${Date.now()}`),
      customer_email: email,
      customer_name: name || "AVEART customer",
      customer_phone: context.customer?.phone || input.data?.customer_phone,
      return_url: this.options_.returnUrl,
    })

    return {
      id: result.payment_id || result.payment?.id,
      status: "pending",
      data: {
        ...(input.data || {}),
        provider: "debitopay",
        payment_id: result.payment_id || result.payment?.id,
        payment_method: result.payment_method || paymentMethod,
        checkout_url: result.checkout_url,
        gateway_status: result.status || "pending",
        currency,
      },
    }
  }

  async authorizePayment(input: any): Promise<any> {
    const data = input.data || {}
    if (!data.payment_id) {
      throw new MedusaError(MedusaError.Types.PAYMENT_AUTHORIZATION_FAILED, "Debito Pay payment session has no payment_id.")
    }
    return {
      status: "pending",
      data: { ...data },
    }
  }

  async getPaymentStatus(input: any): Promise<any> {
    const paymentId = input.data?.payment_id || input.payment_id
    if (!paymentId) return { status: "pending" }

    const result = await this.request("/payment-orchestrator", {
      action: "check-status",
      payment_id: paymentId,
    })
    const status = String(result.payment?.status || result.status || "pending").toLowerCase()
    if (status === "success" || status === "completed" || status === "paid") return { status: "authorized" }
    if (status === "failed" || status === "expired" || status === "cancelled") return { status: "error" }
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

  async refundPayment(input: any): Promise<any> {
    throw new MedusaError(
      MedusaError.Types.NOT_SUPPORTED,
      "Debito Pay refund API has not been wired into this provider yet. Refund from the Debito Pay dashboard."
    )
  }

  async retrievePayment(input: any): Promise<any> {
    return { data: { ...(input.data || {}) } }
  }

  async updatePayment(input: any): Promise<any> {
    return { data: { ...(input.data || {}), ...(input.data || {}) } }
  }

  async getWebhookActionAndData(_data: any): Promise<any> {
    throw new MedusaError(
      MedusaError.Types.NOT_SUPPORTED,
      "Debito Pay webhook reconciliation must be configured and tested before enabling live payments."
    )
  }
}

export default DebitoPayProviderService
