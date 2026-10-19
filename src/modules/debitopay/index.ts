import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import DebitoPayProviderService from "./service"

export default ModuleProvider(Modules.PAYMENT, {
  services: [DebitoPayProviderService],
})
