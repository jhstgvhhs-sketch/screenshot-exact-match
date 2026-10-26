# 3DFLEX — storefront reference implementation

## Changes

- Public-only black (#101010), dark card (#151515), graphite (#242424), orange (#FF6A00), and white (#F5F5F5) theme. The administrative theme is unchanged.
- Two-row desktop header, prominent working search, real database category links, account access, cart count/subtotal, and the configured WhatsApp contact. Mobile has an accessible collapsible navigation/search menu.
- Product gallery with vertical desktop thumbnails, horizontal mobile thumbnails, selected borders, previous/next navigation, and an accessible zoom dialog. Only registered images or the existing fallback are used.
- Product purchase panel: availability, existing brand/title, published review summary only when available, existing short technical fields, dynamic Pix price, configured WhatsApp card simulation, variant selection, bounded quantity stepper, and cart actions.
- Full descriptions and technical details remain below the purchase area. No rates, installments, product specifications, reviews, or stock were invented.
- Reusable purchase-information cards, category product collections on the home page, and search matching category/material as well as the existing name/brand/color fields.
- Existing public cards, banners, first-slide-only Explore CTA, institutional text, footer links, responsive checkout, and stock rules retained. Cart/checkout sticky offsets adjusted for the taller desktop header.

## Changed files

- `src/components/site/Header.tsx`
- `src/components/site/PaymentPrice.tsx`
- `src/components/site/PixIcon.tsx` (new)
- `src/components/site/ProductGallery.tsx` (new)
- `src/components/site/StoreBenefits.tsx` (new)
- `src/components/site/ProductReviews.tsx`
- `src/routes/__root.tsx`
- `src/routes/index.tsx`
- `src/routes/produto.$slug.tsx`
- `src/routes/produtos.tsx`
- `src/routes/carrinho.tsx` (sticky offset only)
- `src/routes/checkout.tsx` (sticky offset only)
- `src/styles.css`
- `src/test/product-experience.test.tsx`
- `src/test/admin-catalog.test.tsx` (adapt existing label assertion to explanatory text added earlier)
- `src/test/payment-price.test.tsx` (new)
- `src/test/store-header.test.tsx` (new)
- This report.

## Validation

- Full automated suite: 270 tests / 55 files passed. After the final display changes, the 10 directly affected product, payment-display and header tests passed again.
- TypeScript and production build passed; scoped lint passed for the newly written components, product route, and related tests.
- Chromium UI checks: 32 page/viewport combinations at 360, 390, 768 and 1440 CSS pixels. Home, printer, filament, product without variants, catalog, cart, checkout and returns page checked for horizontal overflow and captured for visual review.
- Functional browser checks: mobile menu, first-slide-only Explore CTA, carousel controls, gallery navigation/zoom, selected color, quantity limit, adding to cart, navigation, free Pix shipping for an eligible subtotal, and mobile order-summary expansion.
- Visual checks use isolated local fixtures, including intentionally unavailable WhatsApp configuration. The configured WhatsApp destination and dynamic message/amount are covered by unit tests; no message was sent.
- External browser writes were intercepted. No Blackcat/place-order requests occurred and no payment/order was created. No production records were modified.
- Existing database tests cover shipping, coupons/gifts, stock, payment settlement, financial calculations and authorization. This is not a new live gateway transaction or production security audit.

## Preserved / deployment

No migrations, environment variables, provider credentials, backend functions, commercial prices, freight logic, stock rules, payment logic, order data, administrative tools or customer records were changed.

The implementation follows the supplied composition using actual catalog data; it does not insert the reference image's illustrative price, review count, product photos or manufacturer specifications into the store. Photographs/specifications must be registered by the administrator. Printer-specific details can continue to be entered in the existing description/specifications field; no new structured database columns were added.

If store_settings.whatsapp is empty/invalid, the interface links to Contact instead of making up a number. Configure the real WhatsApp in the existing administrative settings to enable simulation links.

GitHub branch: main. Frontend production publication is left to the owner. A published-site visual review remains necessary after that publication; local checks do not establish that production has deployed.
