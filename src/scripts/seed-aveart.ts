import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules, ProductStatus } from "@medusajs/framework/utils";
import {
  createProductCategoriesWorkflow,
  createProductsWorkflow,
  createRegionsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  updateStoresWorkflow,
} from "@medusajs/medusa/core-flows";

const IMAGE = "https://raw.githubusercontent.com/delcidioeliasnhatingo-arch/AveartSouth-Africa/main/src/assets/images/";

export default async function seedAveart({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const storeService = container.resolve(Modules.STORE);
  const salesChannelService = container.resolve(Modules.SALES_CHANNEL);
  const productService = container.resolve(Modules.PRODUCT);
  const regionService = container.resolve(Modules.REGION);
  const fulfillmentService = container.resolve(Modules.FULFILLMENT);
  const link = container.resolve(ContainerRegistrationKeys.LINK);

  const existing = await productService.listProducts({}, { take: 1 });
  if (existing.length) {
    logger.info("AVEART seed skipped: products already exist.");
    return;
  }

  const [store] = await storeService.listStores();
  if (!store) throw new Error("Medusa store is missing.");
  let channels = await salesChannelService.listSalesChannels({ name: "Default Sales Channel" });
  if (!channels.length) throw new Error("Default Sales Channel is missing.");
  const channel = channels[0];
  const profiles = await fulfillmentService.listShippingProfiles({ type: "default" });
  if (!profiles.length) throw new Error("Default shipping profile is missing.");
  const shippingProfile = profiles[0];

  let regions = await regionService.listRegions({ currency_code: "zar" });
  let region = regions[0];
  if (!region) {
    const { result } = await createRegionsWorkflow(container).run({
      input: { regions: [{ name: "South Africa", currency_code: "zar", countries: ["za"], payment_providers: ["pp_system_default"] }] },
    });
    region = result[0];
  }

  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: {
        supported_currencies: [{ currency_code: "zar", is_default: true }],
        default_sales_channel_id: channel.id,
      },
    },
  });

  const apiKeys = await query.graph({
    entity: "api_key",
    fields: ["id"],
    filters: { type: "publishable" },
  });
  if (apiKeys.data?.[0]) {
    await linkSalesChannelsToApiKeyWorkflow(container).run({
      input: { id: apiKeys.data[0].id, add: [channel.id] },
    });
  }

  const { result: categories } = await createProductCategoriesWorkflow(container).run({
    input: {
      product_categories: [
        { name: "Women's Clothing", is_active: true },
        { name: "Men's Clothing", is_active: true },
        { name: "Unisex Essentials", is_active: true },
      ],
    },
  });
  const women = categories.find((c) => c.name === "Women's Clothing")!;
  const men = categories.find((c) => c.name === "Men's Clothing")!;
  const unisex = categories.find((c) => c.name === "Unisex Essentials")!;

  const productData = [
    {
      title: "Tailored Double-Breasted Linen Blazer",
      handle: "tailored-double-breasted-linen-blazer",
      description: "A refined linen-blend blazer designed for versatile everyday styling, from workwear to evening looks.",
      category_ids: [women.id],
      image: "fashion_women_linen_blazer_1792263530901.jpg",
      price: 3450,
      gender: "women",
      material: "Linen blend",
      featured: true,
    },
    {
      title: "Silk-Feel Midi Dress",
      handle: "silk-feel-midi-dress",
      description: "An elegant fluid midi dress with a clean silhouette for occasions and elevated everyday wear.",
      category_ids: [women.id],
      image: "fashion_women_silk_midi_dress_1792263530827.jpg",
      price: 2490,
      gender: "women",
      material: "Polyester satin",
      featured: true,
    },
    {
      title: "Women's Tailored Trousers",
      handle: "womens-tailored-trousers",
      description: "Modern tailored trousers with a versatile cut made to pair with shirts, knits and blazers.",
      category_ids: [women.id],
      image: "fashion_women_linen_blazer_1792263530901.jpg",
      price: 1590,
      gender: "women",
      material: "Polyester blend",
      featured: false,
    },
    {
      title: "Men's Wool-Blend Overshirt",
      handle: "mens-wool-blend-overshirt",
      description: "A versatile layering piece with a structured shape, designed for smart-casual outfits.",
      category_ids: [men.id],
      image: "fashion_men_wool_overshirt_1792263531608.jpg",
      price: 2190,
      gender: "men",
      material: "Wool blend",
      featured: true,
    },
    {
      title: "Men's Selvedge-Style Jeans",
      handle: "mens-selvedge-style-jeans",
      description: "Classic straight-leg denim designed for everyday wear and easy pairing.",
      category_ids: [men.id],
      image: "fashion_men_selvedge_jeans_1792263532797.jpg",
      price: 1890,
      gender: "men",
      material: "Cotton denim",
      featured: true,
    },
    {
      title: "Heavyweight Cotton T-Shirt",
      handle: "heavyweight-cotton-t-shirt",
      description: "A comfortable heavyweight cotton tee with a clean, easy-to-style fit.",
      category_ids: [unisex.id],
      image: "fashion_men_wool_overshirt_1792263531608.jpg",
      price: 650,
      gender: "unisex",
      material: "Cotton",
      featured: false,
    },
  ];

  await createProductsWorkflow(container).run({
    input: {
      products: productData.map((p) => ({
        title: p.title,
        handle: p.handle,
        description: p.description,
        category_ids: p.category_ids,
        status: ProductStatus.PUBLISHED,
        shipping_profile_id: shippingProfile.id,
        images: [{ url: IMAGE + p.image }],
        metadata: { gender: p.gender, material: p.material, featured: p.featured, tags: ["AVEART", "fashion"] },
        options: [{ title: "Size", values: ["S", "M", "L", "XL"] }],
        variants: ["S", "M", "L", "XL"].map((size) => ({
          title: size,
          sku: p.handle.toUpperCase().replace(/-/g, "_") + "_" + size,
          options: { Size: size },
          manage_inventory: false,
          prices: [{ amount: p.price, currency_code: "zar" }],
        })),
        sales_channels: [{ id: channel.id }],
      })),
    },
  });
  logger.info("AVEART seed created 6 published fashion products in ZAR.");
}
