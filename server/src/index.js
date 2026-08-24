import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { authRouter } from './modules/auth/auth.routes.js';
import { catalogRouter } from './modules/catalog/catalog.routes.js';
import { cartRouter } from './modules/cart/cart.routes.js';
import { orderRouter } from './modules/order/order.routes.js';
import { paymentRouter } from './modules/payment/payment.routes.js';
import { aiRouter } from './modules/ai/ai.routes.js';
import { errorHandler } from './middleware/errorHandler.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5050;

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'Ecommerce API running' });
});

app.use('/api/auth', authRouter);
app.use('/api/products', catalogRouter);
app.use('/api/cart', cartRouter);
app.use('/api/orders', orderRouter);
app.use('/api/payments', paymentRouter);
app.use('/api/ai', aiRouter);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
