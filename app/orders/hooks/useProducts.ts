import { useState, useCallback } from 'react';
import type { Product, OrderProduct, Order } from '../types';

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedOrderProducts, setSelectedOrderProducts] = useState<OrderProduct[]>([]);

  const getMaxProductId = useCallback((
    orders: Order[],
    products: Product[]
  ): number => {
    const allProductIds: number[] = [];
    
    // API'den gelen ürünlerden
    products.forEach((p) => {
      if (p.id && typeof p.id === 'number' && p.id > 0) {
        allProductIds.push(p.id);
      }
    });
    
    // Tüm siparişlerdeki ürünlerden
    orders.forEach((order) => {
      if (order.products && Array.isArray(order.products)) {
        order.products.forEach((op) => {
          if (op.productId && typeof op.productId === 'number' && op.productId > 0) {
            allProductIds.push(op.productId);
          }
        });
      }
    });
    
    // LocalStorage'dan da kontrol et
    try {
      const stored = localStorage.getItem('newOrders');
      if (stored) {
        const storedOrders: Order[] = JSON.parse(stored);
        storedOrders.forEach((order) => {
          if (order.products && Array.isArray(order.products)) {
            order.products.forEach((op) => {
              if (op.productId && typeof op.productId === 'number' && op.productId > 0) {
                allProductIds.push(op.productId);
              }
            });
          }
        });
      }
    } catch (e) {
      console.error('LocalStorage okuma hatası:', e);
    }
    
    if (allProductIds.length === 0) return 0;
    
    return Math.max(...allProductIds);
  }, []);

  return {
    products,
    setProducts,
    selectedOrderProducts,
    setSelectedOrderProducts,
    getMaxProductId,
  };
}

