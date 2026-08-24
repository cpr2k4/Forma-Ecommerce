import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { user } = useAuth();
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(false);

  const refreshCart = useCallback(async () => {
    if (!user) {
      setCart(null);
      return;
    }
    setLoading(true);
    try {
      const data = await api.getCart();
      setCart(data.cart);
    } catch {
      setCart(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  async function addItem(variantId, quantity = 1) {
    const data = await api.addToCart({ variantId, quantity });
    setCart(data.cart);
    return data.cart;
  }

  async function updateItem(itemId, quantity) {
    const data = await api.updateCartItem(itemId, { quantity });
    setCart(data.cart);
  }

  async function removeItem(itemId) {
    const data = await api.removeCartItem(itemId);
    setCart(data.cart);
  }

  return (
    <CartContext.Provider
      value={{ cart, loading, refreshCart, addItem, updateItem, removeItem }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
