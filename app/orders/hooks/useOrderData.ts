import { useState, useCallback } from 'react';
import type { Order, OrderProduct, Product } from '../types';
import type { User } from '../../users/types';

interface UseOrderDataProps {
  setOrders: (orders: Order[]) => void;
  setLoading: (loading: boolean) => void;
}

export function useOrderData({ setOrders, setLoading }: UseOrderDataProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const fetchOrders = useCallback(async () => {
    try {
      const response = await fetch('https://fakestoreapi.com/carts');
      let apiOrders: Order[] = [];
      
      if (response.ok) {
        apiOrders = await response.json();
        apiOrders = apiOrders.map((o) => ({
          ...o,
          id: typeof o.id === 'number' ? o.id : parseInt(String(o.id), 10) || 0,
          orderType: o.orderType || '',
        }));
      }
      
      let storedOrders: Order[] = [];
      try {
        const stored = localStorage.getItem('newOrders');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            storedOrders = parsed;
            storedOrders = storedOrders.map((o) => {
              const order = {
                ...o,
                id: typeof o.id === 'number' ? o.id : parseInt(String(o.id), 10) || 0,
              };
              if (order.products && Array.isArray(order.products)) {
                order.products = order.products.map((p: OrderProduct, index: number) => ({
                  ...p,
                  _uniqueKey: p._uniqueKey || `${order.id}-${p.productId}-${index}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                }));
              }
              return order;
            });
          } else {
            localStorage.removeItem('newOrders');
          }
        }
      } catch (storageError) {
        console.error('LocalStorage okuma hatası:', storageError);
        try {
          localStorage.removeItem('newOrders');
        } catch (e) {
          console.error('LocalStorage temizleme hatası:', e);
        }
      }
      
      const uniqueOrdersMap = new Map<number, Order>();
      
      storedOrders.forEach((order) => {
        const id = typeof order.id === 'number' ? order.id : parseInt(String(order.id), 10) || 0;
        if (id > 0 && !uniqueOrdersMap.has(id)) {
          uniqueOrdersMap.set(id, order);
        }
      });
      
      apiOrders.forEach((order) => {
        const id = typeof order.id === 'number' ? order.id : parseInt(String(order.id), 10) || 0;
        if (id > 0 && !uniqueOrdersMap.has(id)) {
          uniqueOrdersMap.set(id, order);
        }
      });
      
      const uniqueOrders = Array.from(uniqueOrdersMap.values());
      uniqueOrders.sort((a, b) => a.id - b.id);
      
      const cleanedStoredOrders = uniqueOrders.filter((o) => 
        storedOrders.some((so) => so.id === o.id)
      );
      localStorage.setItem('newOrders', JSON.stringify(cleanedStoredOrders));
      
      setOrders(uniqueOrders);
    } catch (error) {
      console.error('Siparişler yüklenirken hata:', error);
    }
  }, [setOrders]);

  const fetchUsers = useCallback(async () => {
    try {
      const response = await fetch('https://fakestoreapi.com/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Kullanıcılar yüklenirken hata:', error);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      const response = await fetch('https://fakestoreapi.com/products');
      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      }
    } catch (error) {
      console.error('Ürünler yüklenirken hata:', error);
    }
  }, []);

  return {
    users,
    setUsers,
    products,
    setProducts,
    fetchOrders,
    fetchUsers,
    fetchProducts,
  };
}

