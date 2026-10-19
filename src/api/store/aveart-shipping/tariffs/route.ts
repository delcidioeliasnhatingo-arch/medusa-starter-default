import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

/**
 * AVEART's initial customer-facing shipping tariff table.
 * These are store-configured prices, not live carrier quotes.
 * Revalidate against actual carrier costs before advertising them as guaranteed delivery.
 */
const TARIFFS = [
  {
    id: "aveart-economy",
    name: "AVEART Economy",
    description: "Entrega económica para encomendas elegíveis dentro da África do Sul.",
    amount_zar: 120,
    currency_code: "zar",
    delivery_speed: "economy",
    requires_manual_quote: false,
  },
  {
    id: "aveart-standard",
    name: "AVEART Standard",
    description: "Entrega normal para encomendas elegíveis dentro da África do Sul.",
    amount_zar: 180,
    currency_code: "zar",
    delivery_speed: "standard",
    requires_manual_quote: false,
  },
  {
    id: "aveart-express",
    name: "AVEART Express",
    description: "Tarifa de entrega rápida da AVEART dentro da África do Sul.",
    amount_zar: 300,
    currency_code: "zar",
    delivery_speed: "express",
    requires_manual_quote: false,
  },
  {
    id: "aveart-remote-or-special",
    name: "Entrega remota ou especial",
    description: "Preço a confirmar de acordo com a cobertura, origem, destino, peso e dimensões.",
    amount_zar: 300,
    currency_code: "zar",
    delivery_speed: "special",
    requires_manual_quote: true,
  },
]

export async function GET(_req: MedusaRequest, res: MedusaResponse) {
  return res.status(200).json({
    currency_code: "zar",
    country_code: "za",
    tariffs: TARIFFS,
    note: "Tarifas comerciais iniciais da AVEART. Não são cotações garantidas de transportadoras. Entregas especiais exigem confirmação antes da cobrança.",
  })
}
