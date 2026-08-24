# Requirements — E-commerce Platform (10K Users Scale)

## 1. Scope & Assumptions

- Target scale: ~10,000 registered users, with realistic concurrency of a few hundred simultaneous active users at peak (typical for this user base size).
- Single-region deployment to start; design should not block multi-region later.
- Stack: MERN (MongoDB/PostgreSQL, Express, React, Node.js) + Redis for caching + optional Kafka/RabbitMQ for async messaging.
- Architecture must be modular enough to bolt on AI features later (recommendations, search, chatbots, fraud detection) without a rewrite.

---

## 2. Functional Requirements

### 2.1 User Management
- FR-1: Users can register via email/password, and optionally via OAuth (Google/Facebook).
- FR-2: Users can log in/log out; sessions managed via JWT (access + refresh tokens).
- FR-3: Users can reset/forgot password via email link (OTP or token-based).
- FR-4: Users can view and edit their profile (name, address book, phone, avatar).
- FR-5: Role-based access: `customer`, `seller` (optional/future), `admin`.
- FR-6: Admins can manage users (view, disable, change roles).

### 2.2 Product Catalog
- FR-7: Admins/sellers can create, update, delete, and publish products.
- FR-8: Products support categories, subcategories, tags, brand, and variants (size/color/SKU).
- FR-9: Products have images, description, price, discount, stock quantity.
- FR-10: Users can browse products by category, filter (price, brand, rating), and sort (price, popularity, newest).
- FR-11: Full-text search on product name/description with autocomplete/suggestions.
- FR-12: Product detail page shows reviews, ratings, related/similar products.

### 2.3 Cart & Checkout
- FR-13: Users can add/remove/update quantity of items in a persistent cart (survives across sessions/devices).
- FR-14: Guest checkout supported (cart tied to session, merged into account on login).
- FR-15: Cart validates stock availability and price at checkout time.
- FR-16: Users can apply coupon/discount codes.
- FR-17: Checkout flow: address selection → shipping method → payment → order confirmation.

### 2.4 Orders
- FR-18: System creates an order record with line items, pricing snapshot, shipping/billing address, and status.
- FR-19: Order status lifecycle: `PENDING → PAID → PROCESSING → SHIPPED → DELIVERED → CANCELLED/RETURNED/REFUNDED`.
- FR-20: Users can view order history and track order status.
- FR-21: Users can cancel an order (within an allowed window) or request a return/refund.
- FR-22: Admin can view/manage all orders and update fulfillment status.

### 2.5 Payments
- FR-23: Integration with a payment gateway (Stripe/Razorpay/PayPal) for card/UPI/wallet payments.
- FR-24: Support Cash on Delivery (COD) as a fallback payment method (optional, market-dependent).
- FR-25: Payment webhooks update order status asynchronously and idempotently.
- FR-26: Refunds are processed through the payment gateway and reflected in order status.

### 2.6 Inventory
- FR-27: Stock quantity decremented on successful order placement; restored on cancellation.
- FR-28: Low-stock alerts to admin/seller.
- FR-29: Prevent overselling via atomic stock checks (optimistic locking / conditional updates).

### 2.7 Reviews & Ratings
- FR-30: Verified purchasers can leave a rating (1–5) and written review per product.
- FR-31: Users can edit/delete their own review.
- FR-32: Admin can moderate (hide/delete) reviews.

### 2.8 Notifications
- FR-33: Email notifications for signup, order confirmation, shipping updates, password reset.
- FR-34: In-app notifications (order status changes, promotions).
- FR-35: (Future) SMS/push notifications via the same async messaging pipeline.

### 2.9 Admin & Analytics
- FR-36: Admin dashboard: sales summary, top products, order counts, user growth.
- FR-37: CSV/JSON export of orders and products.
- FR-38: Basic audit log for admin actions (who changed what, when).

### 2.10 Extensibility (Future / AI-ready)
- FR-39: Architecture should support plugging in a recommendation engine ("customers also bought", personalized homepage).
- FR-40: Architecture should support an AI-powered search/semantic search service.
- FR-41: Architecture should support a chatbot/support-assistant service.
- FR-42: Architecture should support fraud/anomaly detection on orders/payments.

---

## 3. Non-Functional Requirements

### 3.1 Performance
- NFR-1: P95 API response time < 300ms for read endpoints (catalog, cart) under normal load.
- NFR-2: Homepage/catalog pages should leverage caching (Redis) to serve most reads without hitting the DB.
- NFR-3: Support ~200–500 concurrent active users comfortably on modest infrastructure (2–4 app instances).

### 3.2 Scalability
- NFR-4: Stateless application servers (session state in Redis/JWT, not in-memory) so the app tier can scale horizontally behind a load balancer.
- NFR-5: Database and cache layers should scale independently of the app tier (vertical scaling sufficient at 10K-user scale; design should not preclude read replicas/sharding later).
- NFR-6: Message queue (Kafka/RabbitMQ) reserved for future decoupling of heavy/async workloads (emails, analytics, order events) — not mandatory at day one, but interfaces should be queue-ready.

### 3.3 Availability & Reliability
- NFR-7: Target uptime: 99.5% (acceptable for this scale; no need for multi-region active-active).
- NFR-8: Graceful degradation: if Redis is down, fall back to DB reads (with higher latency) rather than failing requests.
- NFR-9: Payment and order-status updates must be idempotent (safe to retry/replay webhooks).
- NFR-10: Automated daily database backups with tested restore procedure.

### 3.4 Security
- NFR-11: All traffic over HTTPS/TLS.
- NFR-12: Passwords hashed with bcrypt/argon2; never stored in plaintext.
- NFR-13: JWT access tokens short-lived (~15 min); refresh tokens rotated and stored securely (httpOnly cookies).
- NFR-14: Input validation and sanitization on all endpoints (prevent NoSQL/SQL injection, XSS).
- NFR-15: Rate limiting on auth and search endpoints to prevent abuse/brute force.
- NFR-16: PCI-DSS scope minimized by never storing raw card data — delegate to payment gateway (tokenization).
- NFR-17: Role-based authorization enforced at the API layer, not just the UI.

### 3.5 Maintainability & Modularity
- NFR-18: Backend organized as modular services/domains (Users, Catalog, Cart, Orders, Payments, Reviews, Notifications) — deployable as a modular monolith now, splittable into microservices later.
- NFR-19: Clear API contracts (REST, versioned e.g. `/api/v1/...`) between frontend and backend.
- NFR-20: New AI-related capabilities should be addable as separate services/modules that consume existing events/data without modifying core order/payment logic.
- NFR-21: Infrastructure-as-code / containerization (Docker) for reproducible environments.

### 3.6 Observability
- NFR-22: Centralized structured logging (request id, user id, correlation id).
- NFR-23: Basic metrics/monitoring (request rate, error rate, latency) and alerting on error spikes.
- NFR-24: Health check endpoints for each service for load balancer / orchestration checks.

### 3.7 Usability
- NFR-25: Responsive UI (mobile + desktop) using React.
- NFR-26: Accessible design (semantic HTML, keyboard navigation, ARIA where relevant).
- NFR-27: Clear error messages and loading states across the app.

### 3.8 Data Integrity
- NFR-28: Financial fields (price, totals) stored with fixed precision (avoid floating point rounding issues — use integer minor units or decimal types).
- NFR-29: Order line items store a price/product snapshot at time of purchase (immutable), independent of later product price changes.
