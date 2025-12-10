import { useState, useCallback } from 'react';
import type { Order, OrderProduct, Product } from '../types';

export function useOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

  const getMaxOrderId = useCallback((): number => {
    const allOrders = [...orders];
    
    // LocalStorage'dan da kontrol et
    try {
      const stored = localStorage.getItem('newOrders');
      if (stored) {
        const storedOrders: Order[] = JSON.parse(stored);
        allOrders.push(...storedOrders);
      }
    } catch (e) {
      console.error('LocalStorage okuma hatası:', e);
    }
    
    if (allOrders.length === 0) return 0;
    
    const ids = allOrders
      .map((o) => {
        const id = o.id;
        if (typeof id === 'number') return id;
        const parsed = parseInt(String(id), 10);
        return isNaN(parsed) ? 0 : parsed;
      })
      .filter((id) => id > 0);
    
    return ids.length > 0 ? Math.max(...ids) : 0;
  }, [orders]);

  return {
    orders,
    setOrders,
    loading,
    setLoading,
    selectedOrderId,
    setSelectedOrderId,
    getMaxOrderId,
  };
}

