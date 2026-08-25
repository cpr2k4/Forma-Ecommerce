# API Design — FORMA Ecommerce

Base URL (local): `http://localhost:5050/api`  
Content-Type: `application/json`  
Client helper: `client/src/api.js`

---

## 1. Conventions

### Auth
| Mode | Header | Used by |
|---|---|---|
| Public | — | Health, catalog, auth register/login/google, payment config, AI chat |
| Required | `Authorization: Bearer <JWT>` | `/me`, cart, orders |
| Optional | Bearer if present | AI chat (personalized phrasing later) |

JWT payload: `{ role }` with subject = `user.id`. Default expiry: `7d` (`JWT_EXPIRES_IN`).

### Money object
All prices return:

```json
{
  "cents": 329900,
  "currency": "INR",
  "formatted": "₹3,299"
}
```

### Errors
All failures return:

```json
{ "error": "Human-readable message" }
```

| Status | Meaning |
|---|---|
| 400 | Validation / business rule (empty cart, stock, bad signature) |
| 401 | Missing/invalid credentials or token |
| 403 | Disabled account / forbidden |
| 404 | Resource not found |
| 409 | Conflict (email already registered) |
| 503 | External config missing (e.g. Razorpay keys, Google client ID) |
| 500 | Unexpected server error |

### Modules

| Prefix | Module | Auth |
|---|---|---|
| `/health` | Health | Public |
| `/auth` | Auth | Mixed |
| `/products` | Catalog | Public |
| `/cart` | Cart | Required |
| `/orders` | Orders + checkout | Required |
| `/payments` | Payment config | Public |
| `/ai` | Chatbot | Optional |

---

## 2. Endpoint summary

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/health` | — | Liveness check |
| `POST` | `/auth/register` | — | Create account + empty cart |
| `POST` | `/auth/login` | — | Login, return JWT |
| `POST` | `/auth/google` | — | Sign in / sign up with Google ID token |
| `GET` | `/auth/me` | ✅ | Current user |
| `GET` | `/products` | — | List/search/filter products |
| `GET` | `/products/categories` | — | List categories |
| `GET` | `/products/:slug` | — | Product detail + reviews |
| `GET` | `/cart` | ✅ | Get cart (creates if missing) |
| `POST` | `/cart/items` | ✅ | Add / merge line item |
| `PATCH` | `/cart/items/:itemId` | ✅ | Update quantity |
| `DELETE` | `/cart/items/:itemId` | ✅ | Remove line item |
| `GET` | `/orders` | ✅ | Order history |
| `GET` | `/orders/:id` | ✅ | Single order |
| `POST` | `/orders/checkout` | ✅ | Create PENDING order + Razorpay order |
| `POST` | `/orders/:id/confirm-payment` | ✅ | Verify payment, mark PAID, decrement stock |
| `GET` | `/payments/config` | — | Public Razorpay key + currency |
| `POST` | `/ai/chat` | Optional | FORMA Assist chatbot |
| `GET` | `/profile` | ✅ | Current user + addresses |
| `PATCH` | `/profile` | ✅ | Update name, phone, email, avatarUrl |
| `POST` | `/profile/avatar` | ✅ | Upload avatar (multipart `avatar`) |
| `POST` | `/profile/addresses` | ✅ | Create address |
| `PATCH` | `/profile/addresses/:id` | ✅ | Update own address |
| `DELETE` | `/profile/addresses/:id` | ✅ | Delete own address |
| `PATCH` | `/profile/addresses/:id/default` | ✅ | Set default address |
| `GET` | `/admin/stats` | ✅ ADMIN | Dashboard counts |
| `GET` | `/admin/products` | ✅ ADMIN | List all products (incl. unpublished) |
| `GET` | `/admin/products/:id` | ✅ ADMIN | Product by id |
| `POST` | `/admin/products/upload-image` | ✅ ADMIN | Upload product image (multipart `image`) |
| `POST` | `/admin/products` | ✅ ADMIN | Create product + variants |
| `PATCH` | `/admin/products/:id` | ✅ ADMIN | Update product + variants |
| `DELETE` | `/admin/products/:id` | ✅ ADMIN | Delete product (blocked if order history) |
| `GET` | `/admin/inventory` | ✅ ADMIN | Flat SKU stock list |
| `PATCH` | `/admin/inventory/:variantId` | ✅ ADMIN | Update stockQty |
| `GET` | `/admin/categories` | ✅ ADMIN | Categories |
| `POST` | `/admin/categories` | ✅ ADMIN | Create category |
| `GET` | `/admin/orders` | ✅ ADMIN | All orders |
| `PATCH` | `/admin/orders/:id/status` | ✅ ADMIN | Update order status |

---

## 3. Health

### `GET /health`

**Response `200`**
```json
{
  "status": "ok",
  "message": "Ecommerce API running"
}
```

---

## 4. Auth — `/auth`

### `POST /auth/register`

**Body**
```json
{
  "email": "user@example.com",
  "password": "secret12",
  "fullName": "Ada Lovelace",
  "phone": "9876543210"
}
```

| Field | Rules |
|---|---|
| `email` | Required, valid email (stored lowercase) |
| `password` | Required, min 6 chars |
| `fullName` | Required, min 2 chars |
| `phone` | Optional |

**Response `201`**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "fullName": "Ada Lovelace",
    "phone": "9876543210",
    "role": "CUSTOMER",
    "avatarUrl": null,
    "hasPassword": true
  },
  "token": "eyJhbGciOi..."
}
```

Also creates an empty `cart` for the user. `hasPassword` lets the client distinguish password accounts from Google-only accounts (e.g. to hide/show a "change password" option).

**Errors:** `400` validation · `409` email already registered

---

### `POST /auth/login`

**Body**
```json
{
  "email": "demo@shop.com",
  "password": "password123"
}
```

**Response `200`** — same shape as register (`user` + `token`).

**Errors:**
- `401` invalid credentials
- `403` account disabled
- `400` account has no password (Google-only) — message: *"This account uses Google sign-in. Continue with Google instead."*

---

### `POST /auth/google`

Sign in **or** sign up using a Google Identity Services ID token (obtained client-side via the "Continue with Google" button — see `client/src/components/GoogleAuthButton.jsx`). No password involved; the server verifies the token's signature and audience directly with Google.

**Body**
```json
{
  "credential": "eyJhbGciOiJSUzI1NiIsImtpZCI6..."
}
```

| Field | Rules |
|---|---|
| `credential` | Required. Google ID token JWT from `google.accounts.id` callback |

**Behavior**
1. Verify the token via `google-auth-library` (`OAuth2Client.verifyIdToken`), checking signature, expiry, and audience (`GOOGLE_CLIENT_ID`).
2. Look up user by `googleId`. If not found, look up by email:
   - **Existing email/password account** → link `googleId` to it (no duplicate user).
   - **No existing account** → create a new user (`passwordHash: null`, `googleId`, `avatarUrl` from Google profile picture) + empty cart.
3. Issue the same JWT shape as `/auth/login`.

**Response `200`**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@gmail.com",
    "fullName": "Ada Lovelace",
    "phone": null,
    "role": "CUSTOMER",
    "avatarUrl": "https://lh3.googleusercontent.com/...",
    "hasPassword": false
  },
  "token": "eyJhbGciOi..."
}
```

**Errors:**
- `400` malformed/missing credential
- `401` invalid/expired/unverified Google token
- `403` account disabled
- `503` `GOOGLE_CLIENT_ID` not configured on the server

---

### `GET /auth/me`

**Headers:** `Authorization: Bearer <token>`

**Response `200`**
```json
{
  "user": {
    "id": "uuid",
    "email": "demo@shop.com",
    "fullName": "Demo User",
    "phone": null,
    "role": "CUSTOMER",
    "avatarUrl": null,
    "hasPassword": true
  }
}
```

**Errors:** `401` · `404` user not found

---

## 5. Catalog — `/products`

### `GET /products`

**Query params**

| Param | Type | Description |
|---|---|---|
| `q` | string | Case-insensitive search on name, description, brand |
| `category` | string | Category **slug** filter |
| `sort` | string | `newest` (default) · `price_asc` · `price_desc` · `rating` |

**Example:** `GET /products?q=lamp&category=home&sort=price_asc`

**Response `200`**
```json
{
  "products": [
    {
      "id": "uuid",
      "name": "Desk Lamp",
      "slug": "desk-lamp",
      "description": "...",
      "brand": "FORMA",
      "imageUrl": "https://...",
      "category": { "id": "uuid", "name": "Home", "slug": "home" },
      "price": { "cents": 329900, "currency": "INR", "formatted": "₹3,299" },
      "avgRating": 4.5,
      "reviewCount": 12,
      "attributes": {},
      "variants": [
        {
          "id": "uuid",
          "sku": "LAMP-01",
          "attrs": { "color": "Brass" },
          "price": { "cents": 329900, "currency": "INR", "formatted": "₹3,299" },
          "stockQty": 20,
          "inStock": true
        }
      ]
    }
  ]
}
```

Only `isPublished: true` products are returned. `price` is the minimum variant price (or `basePriceCents`).

---

### `GET /products/categories`

**Response `200`**
```json
{
  "categories": [
    { "id": "uuid", "name": "Home", "slug": "home", "parentId": null }
  ]
}
```

---

### `GET /products/:slug`

**Response `200`**
```json
{
  "product": {
    "id": "uuid",
    "name": "Desk Lamp",
    "slug": "desk-lamp",
    "...": "(same fields as list item)",
    "reviews": [
      {
        "id": "uuid",
        "rating": 5,
        "title": "Great light",
        "body": "...",
        "author": "Demo User",
        "createdAt": "2026-08-21T10:00:00.000Z"
      }
    ]
  }
}
```

Reviews: latest 10, includes author display name.

**Errors:** `404` product not found / unpublished

---

## 6. Cart — `/cart`

All routes require JWT. Cart is auto-created if missing.

### `GET /cart`

**Response `200`**
```json
{
  "cart": {
    "id": "uuid",
    "itemCount": 2,
    "subtotal": { "cents": 659800, "currency": "INR", "formatted": "₹6,598" },
    "items": [
      {
        "id": "uuid",
        "quantity": 2,
        "variantId": "uuid",
        "product": {
          "id": "uuid",
          "name": "Desk Lamp",
          "slug": "desk-lamp",
          "imageUrl": "https://..."
        },
        "attrs": { "color": "Brass" },
        "unitPrice": { "cents": 329900, "currency": "INR", "formatted": "₹3,299" },
        "lineTotal": { "cents": 659800, "currency": "INR", "formatted": "₹6,598" },
        "stockQty": 20
      }
    ]
  }
}
```

---

### `POST /cart/items`

**Body**
```json
{
  "variantId": "uuid",
  "quantity": 1
}
```

| Field | Rules |
|---|---|
| `variantId` | Required UUID |
| `quantity` | Integer 1–20 (default 1) |

If the variant is already in the cart, quantities are **merged**. Stock is checked against available `stockQty`.

**Response `201`** — `{ cart }` (same shape as `GET /cart`)

**Errors:** `400` not enough stock / validation · `404` variant not found / unpublished product

---

### `PATCH /cart/items/:itemId`

**Body**
```json
{ "quantity": 3 }
```

`quantity`: integer 1–20.

**Response `200`** — `{ cart }`

**Errors:** `400` · `404` cart item not found

---

### `DELETE /cart/items/:itemId`

**Response `200`** — `{ cart }`

**Errors:** `404` cart item not found

---

## 7. Orders — `/orders`

All routes require JWT. Users only see/mutate their own orders.

### Pricing rules (checkout)
| Component | Rule |
|---|---|
| Subtotal | Σ (variant price × qty) |
| Shipping | `₹0` if subtotal ≥ ₹999; else ₹49 |
| Tax | 5% of subtotal (rounded) |
| Total | subtotal + shipping + tax |

Stock is **not** decremented at checkout — only after successful payment confirmation.

---

### `GET /orders`

**Response `200`**
```json
{
  "orders": [
    {
      "id": "uuid",
      "status": "PAID",
      "subtotal": { "cents": 329900, "currency": "INR", "formatted": "₹3,299" },
      "shipping": { "cents": 4900, "currency": "INR", "formatted": "₹49" },
      "tax": { "cents": 16495, "currency": "INR", "formatted": "₹165" },
      "total": { "cents": 351295, "currency": "INR", "formatted": "₹3,513" },
      "shippingAddress": {
        "fullName": "Ada Lovelace",
        "phone": "9876543210",
        "line1": "12 Park Street",
        "city": "Mumbai",
        "postalCode": "400001",
        "country": "IN"
      },
      "placedAt": "2026-08-21T10:00:00.000Z",
      "items": [
        {
          "id": "uuid",
          "productName": "Desk Lamp",
          "attrs": { "color": "Brass" },
          "quantity": 1,
          "unitPrice": { "cents": 329900, "currency": "INR", "formatted": "₹3,299" },
          "lineTotal": { "cents": 329900, "currency": "INR", "formatted": "₹3,299" }
        }
      ]
    }
  ]
}
```

Sorted by `placedAt` descending.

---

### `GET /orders/:id`

**Response `200`** — `{ order }` (same order object as above)

**Errors:** `404` not found or not owned by user

---

### `POST /orders/checkout`

Creates a `PENDING` order, a Razorpay order, and a payment row (`INITIATED`). Cart is **not** cleared until payment confirms.

**Body**
```json
{
  "shippingAddress": {
    "fullName": "Ada Lovelace",
    "phone": "9876543210",
    "line1": "12 Park Street",
    "line2": "Apt 4",
    "city": "Mumbai",
    "state": "MH",
    "postalCode": "400001",
    "country": "IN"
  }
}
```

| Field | Rules |
|---|---|
| `fullName` | min 2 |
| `phone` | min 8 |
| `line1` | min 3 |
| `line2` | optional |
| `city` | min 2 |
| `state` | optional |
| `postalCode` | min 4 |
| `country` | default `"IN"` |

**Response `201`**
```json
{
  "order": { "...": "mapped order, status PENDING" },
  "razorpay": {
    "keyId": "rzp_test_...",
    "orderId": "order_...",
    "amount": 351295,
    "currency": "INR"
  }
}
```

Client opens Razorpay Checkout with `razorpay.keyId` + `razorpay.orderId`, then calls confirm-payment.

**Errors:** `400` empty cart / insufficient stock / validation · Razorpay misconfig bubbles as error

---

### `POST /orders/:id/confirm-payment`

Verifies Razorpay signature, marks order `PAID`, decrements variant stock, clears cart items. Idempotent if already `PAID`.

**Body**
```json
{
  "razorpay_order_id": "order_...",
  "razorpay_payment_id": "pay_...",
  "razorpay_signature": "..."
}
```

**Response `200`**
```json
{
  "order": { "...": "mapped order, status PAID" },
  "message": "Payment successful"
}
```

(Already paid → `"Order already paid"`.)

**Errors:** `400` mismatch / invalid signature / stock race · `404` order not found

---

## 8. Payments — `/payments`

### `GET /payments/config`

Public config for initializing Razorpay on the client (key id only — never the secret).

**Response `200`**
```json
{
  "provider": "razorpay",
  "keyId": "rzp_test_...",
  "currency": "INR"
}
```

**Errors:** `503` if `RAZORPAY_KEY_ID` missing / placeholder

---

## 9. AI Chatbot — `/ai`

### `POST /ai/chat`

FORMA Assist: rule-based FAQ + catalog product search. Auth optional.

**Body**
```json
{
  "message": "show me lamp"
}
```

| Field | Rules |
|---|---|
| `message` | Required string, 1–500 chars |

**Response `200`**
```json
{
  "reply": "Here are some picks from the shop:\n• Desk Lamp — ₹3,299\n\nOpen any product from Shop to see details and add to cart.",
  "suggestions": ["Shipping info", "How to checkout", "Return policy"],
  "products": [
    {
      "id": "uuid",
      "name": "Desk Lamp",
      "slug": "desk-lamp",
      "category": "Home",
      "price": "₹3,299"
    }
  ]
}
```

| Field | Meaning |
|---|---|
| `reply` | Assistant text (may include newlines) |
| `suggestions` | Quick-reply chips for the UI |
| `products` | Optional catalog hits (link via `/product/:slug`) |

**Intents covered today:** shipping, returns, payments, checkout, account, orders, greetings, product browse/search.

**Errors:** `400` empty / too long message

**Upgrade path:** same contract; swap `assistantReply()` for an LLM without changing this route or the client.

---

## 10. Typical client flows

### Browse → cart → pay
```
GET  /products
GET  /products/:slug
POST /cart/items          { variantId, quantity }
GET  /cart
POST /orders/checkout     { shippingAddress }
     → open Razorpay Checkout (keyId, orderId, amount)
POST /orders/:id/confirm-payment
     { razorpay_order_id, razorpay_payment_id, razorpay_signature }
GET  /orders
```

### Auth
```
POST /auth/register  OR  POST /auth/login
→ store token in localStorage
GET  /auth/me          (on app load)
```

### Chat
```
POST /ai/chat  { message }
→ render reply + suggestions + product links
```

---

## 11. Client mapping (`api.js`)

| Helper | HTTP |
|---|---|
| `api.register(body)` | `POST /auth/register` |
| `api.login(body)` | `POST /auth/login` |
| `api.googleAuth(body)` | `POST /auth/google` |
| `api.me()` | `GET /auth/me` |
| `api.getProducts(params)` | `GET /products?...` |
| `api.getCategories()` | `GET /products/categories` |
| `api.getProduct(slug)` | `GET /products/:slug` |
| `api.getCart()` | `GET /cart` |
| `api.addToCart(body)` | `POST /cart/items` |
| `api.updateCartItem(id, body)` | `PATCH /cart/items/:id` |
| `api.removeCartItem(id)` | `DELETE /cart/items/:id` |
| `api.checkout(body)` | `POST /orders/checkout` |
| `api.confirmPayment(orderId, body)` | `POST /orders/:id/confirm-payment` |
| `api.getPaymentConfig()` | `GET /payments/config` |
| `api.getOrders()` | `GET /orders` |
| `api.chat(body)` | `POST /ai/chat` |
| `api.getProfile()` | `GET /profile` |
| `api.updateProfile(body)` | `PATCH /profile` |
| `api.uploadAvatar(file)` | `POST /profile/avatar` |
| `api.createAddress(body)` | `POST /profile/addresses` |
| `api.updateAddress(id, body)` | `PATCH /profile/addresses/:id` |
| `api.deleteAddress(id)` | `DELETE /profile/addresses/:id` |
| `api.setDefaultAddress(id)` | `PATCH /profile/addresses/:id/default` |
| `api.adminStats()` | `GET /admin/stats` |
| `api.adminProducts()` | `GET /admin/products` |
| `api.adminProduct(id)` | `GET /admin/products/:id` |
| `api.adminUploadProductImage(file)` | `POST /admin/products/upload-image` |
| `api.adminCreateProduct(body)` | `POST /admin/products` |
| `api.adminUpdateProduct(id, body)` | `PATCH /admin/products/:id` |
| `api.adminDeleteProduct(id)` | `DELETE /admin/products/:id` |
| `api.adminInventory()` | `GET /admin/inventory` |
| `api.adminUpdateStock(id, body)` | `PATCH /admin/inventory/:id` |
| `api.adminCategories()` | `GET /admin/categories` |
| `api.adminCreateCategory(body)` | `POST /admin/categories` |
| `api.adminOrders()` | `GET /admin/orders` |
| `api.adminUpdateOrderStatus(id, body)` | `PATCH /admin/orders/:id/status` |

---

## 12. Profile — `/profile` (authenticated)

All routes require `Authorization: Bearer <token>`.

### `GET /profile`
```json
{
  "user": {
    "id": "uuid",
    "email": "demo@shop.com",
    "fullName": "Demo Customer",
    "phone": "9876543210",
    "role": "CUSTOMER",
    "avatarUrl": null,
    "hasPassword": true
  },
  "addresses": [
    {
      "id": "uuid",
      "label": "Home",
      "fullName": "Demo Customer",
      "phone": "9876543210",
      "line1": "12 Park Street",
      "line2": null,
      "city": "Mumbai",
      "state": "MH",
      "postalCode": "400001",
      "country": "IN",
      "isDefault": true
    }
  ]
}
```

### `PATCH /profile`
Update any of: `fullName`, `phone`, `email`, `avatarUrl` (URL string or empty/null to clear).
Email is lowercased; `409` if already taken.

### `POST /profile/avatar`
Multipart form field: `avatar` (JPEG, PNG, WebP, or GIF · max 5MB).
Stores file under `server/uploads/avatars/` and sets `avatarUrl` to `/uploads/avatars/<filename>`.
Served statically at `GET /uploads/...` (API origin, not under `/api`).

```json
{ "user": { "id": "uuid", "avatarUrl": "/uploads/avatars/....jpg", "...": "..." } }
```

### Addresses
- `POST /profile/addresses` — create (first address becomes default automatically)
- `PATCH /profile/addresses/:id` — update own address; `isDefault: true` clears other defaults
- `DELETE /profile/addresses/:id` — delete; promotes another address to default if needed
- `PATCH /profile/addresses/:id/default` — set as default

Ownership enforced — other users' address ids return `404`.

---

## 13. Admin — `/admin` (ADMIN role required)

All routes require `Authorization: Bearer <token>` where `role === ADMIN`.

Prices in create/update bodies are **rupees** (e.g. `7999` → stored as `799900` cents).

### `GET /admin/stats`
```json
{ "products": 6, "variants": 12, "lowStock": 2, "outOfStock": 1, "orders": 3 }
```

### `GET /admin/products` · `GET /admin/products/:id`
Returns products including unpublished, with `isPublished` and full variants.

### `POST /admin/products/upload-image`
Multipart form field: `image` (same type/size limits as avatar).
Returns `{ "imageUrl": "/uploads/products/<filename>" }` — pass that into create/update product `imageUrl`.

### `POST /admin/products` · `PATCH /admin/products/:id`
```json
{
  "name": "Desk Lamp",
  "slug": "desk-lamp",
  "brand": "FORMA",
  "description": "...",
  "categorySlug": "home",
  "imageUrl": "https://...",
  "basePrice": 3299,
  "isPublished": true,
  "variants": [
    { "id": "uuid-optional-on-update", "sku": "LAMP-01", "color": "Brass", "size": "", "price": 3299, "stockQty": 20 }
  ]
}
```

### `DELETE /admin/products/:id`
Fails with `400` if any variant appears on an order — unpublish instead.

### `GET /admin/inventory` · `PATCH /admin/inventory/:variantId`
Patch body: `{ "stockQty": 42 }`

### `GET /admin/orders` · `PATCH /admin/orders/:id/status`
Status body: `{ "status": "SHIPPED" }`  
Allowed: `PENDING` | `PAID` | `PROCESSING` | `SHIPPED` | `DELIVERED` | `CANCELLED`

---

## 14. Planned / not implemented yet

| Area | Notes |
|---|---|
| Reviews write API | `reviews` table exists; only read on product detail |
| Guest cart | Cart requires auth |
| Password reset | Not implemented |
| Other OAuth providers (Apple, GitHub, etc.) | Only Google implemented |
| Razorpay webhooks | Confirm is client-driven today |
| Admin user management | Not implemented |
| Image file upload | Image URL text field only |
| API versioning (`/api/v1`) | Flat `/api` for MVP |
| Rate limiting | Documented for Redis later |

When adding endpoints, update this file and keep `client/src/api.js` in sync.
