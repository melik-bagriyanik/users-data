import { useCallback, useRef } from 'react';
import type { Order } from '../types';

interface UseOrderHandlersProps {
  orders: Order[];
  setOrders: (orders: Order[]) => void;
  selectedOrderId: number | null;
  setSelectedOrderId: (id: number | null) => void;
  getMaxOrderId: () => number;
  productGridRef: React.RefObject<any>;
}

export function useOrderHandlers({
  orders,
  setOrders,
  selectedOrderId,
  setSelectedOrderId,
  getMaxOrderId,
  productGridRef,
}: UseOrderHandlersProps) {
  const handleOrderRowInserted = useCallback(async (e: any) => {
    try {
      const newOrder = { ...e.data };
      
      // ID'yi otomatik oluştur (en yüksek ID + 1)
      const maxId = getMaxOrderId();
      const newId = maxId + 1;
      newOrder.id = newId;
      
      // ID kontrolü - aynı ID'ye sahip sipariş var mı?
      const existingInState = orders.find((o) => o.id === newId);
      let existingInStorage = false;
      try {
        const stored = localStorage.getItem('newOrders');
        if (stored) {
          const storedOrders: Order[] = JSON.parse(stored);
          existingInStorage = storedOrders.some((o) => o.id === newId);
        }
      } catch (e) {
        console.error('LocalStorage kontrol hatası:', e);
      }
      
      if (existingInState || existingInStorage) {
        let nextId = newId + 1;
        while (orders.some((o) => o.id === nextId)) {
          try {
            const stored = localStorage.getItem('newOrders');
            if (stored) {
              const storedOrders: Order[] = JSON.parse(stored);
              if (storedOrders.some((o) => o.id === nextId)) {
                nextId++;
                continue;
              }
            }
          } catch (e) {
            // Hata durumunda devam et
          }
          nextId++;
        }
        newOrder.id = nextId;
      }
      
      // Tarih yoksa bugünün tarihini ekle
      if (!newOrder.date) {
        newOrder.date = new Date().toISOString();
      }
      
      // Products yoksa boş array ekle
      if (!newOrder.products) {
        newOrder.products = [];
      }
      
      // OrderType yoksa boş string ekle
      if (!newOrder.orderType) {
        newOrder.orderType = '';
      }
      
      // UserId yoksa veya 0 ise, varsayılan olarak 1 ekle
      if (!newOrder.userId || newOrder.userId === 0) {
        newOrder.userId = 1;
      }
      
      // LocalStorage'a kaydet
      try {
        const stored = localStorage.getItem('newOrders');
        let storedOrders: Order[] = [];
        
        if (stored) {
          try {
            storedOrders = JSON.parse(stored);
            if (!Array.isArray(storedOrders)) {
              storedOrders = [];
            }
          } catch (parseError) {
            console.error('LocalStorage parse hatası:', parseError);
            storedOrders = [];
          }
        }
        
        storedOrders.push(newOrder);
        
        // Boyut kontrolü yap
        const dataString = JSON.stringify(storedOrders);
        const dataSize = new Blob([dataString]).size;
        const maxSize = 4 * 1024 * 1024; // 4MB
        
        if (dataSize > maxSize) {
          alert('Veri çok büyük! Lütfen bazı fotoğrafları kaldırın veya daha küçük fotoğraflar kullanın.');
          console.error('LocalStorage boyut limiti aşıldı:', dataSize, 'bytes');
          return;
        }
        
        localStorage.setItem('newOrders', dataString);
        console.log('LocalStorage\'a kaydedildi:', newOrder.id, storedOrders.length);
      } catch (storageError: any) {
        if (storageError.name === 'QuotaExceededError') {
          alert('Depolama alanı dolu! Lütfen bazı fotoğrafları kaldırın veya daha küçük fotoğraflar kullanın.');
        } else {
          console.error('LocalStorage yazma hatası:', storageError);
        }
        return;
      }
      
      // State'i güncelle
      const updatedOrders = [...orders, newOrder];
      setOrders(updatedOrders);
      
      // Yeni eklenen siparişi otomatik seç
      setTimeout(() => {
        setSelectedOrderId(newOrder.id);
        setTimeout(() => {
          if (productGridRef.current && productGridRef.current.instance) {
            try {
              productGridRef.current.instance.addRow();
            } catch (e) {
              console.log('Grid ref henüz hazır değil');
            }
          }
        }, 300);
      }, 100);
      
      // API'ye gönder (opsiyonel)
      try {
        await fetch('https://fakestoreapi.com/carts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newOrder),
        });
      } catch (apiError) {
        console.error('API hatası (localStorage\'da kayıtlı):', apiError);
      }
    } catch (error) {
      console.error('Sipariş eklenirken hata:', error);
      alert('Sipariş eklenirken bir hata oluştu!');
    }
  }, [orders, setOrders, getMaxOrderId, setSelectedOrderId, productGridRef]);

  const handleOrderRowUpdated = useCallback(async (e: any) => {
    try {
      const updatedOrder = e.data;
      updatedOrder.id = Number(updatedOrder.id);
      
      // ID kontrolü
      const ordersWithSameIdInState = orders.filter((o) => o.id === updatedOrder.id);
      let ordersWithSameIdInStorage: Order[] = [];
      try {
        const stored = localStorage.getItem('newOrders');
        if (stored) {
          const storedOrders: Order[] = JSON.parse(stored);
          ordersWithSameIdInStorage = storedOrders.filter((o) => o.id === updatedOrder.id);
        }
      } catch (e) {
        console.error('LocalStorage kontrol hatası:', e);
      }
      
      const totalSameId = ordersWithSameIdInState.length + ordersWithSameIdInStorage.length;
      if (totalSameId > 1) {
        const existingOrder = orders.find((o) => o.id === updatedOrder.id);
        if (existingOrder && existingOrder !== updatedOrder) {
          alert('Bu ID\'ye sahip başka bir sipariş zaten var!');
          return;
        }
      }
      
      // LocalStorage'ı güncelle
      try {
        const stored = localStorage.getItem('newOrders');
        let storedOrders: Order[] = [];
        
        if (stored) {
          try {
            storedOrders = JSON.parse(stored);
            if (!Array.isArray(storedOrders)) {
              storedOrders = [];
            }
          } catch (parseError) {
            console.error('LocalStorage parse hatası:', parseError);
            storedOrders = [];
          }
        }
        
        const index = storedOrders.findIndex((o) => o.id === updatedOrder.id);
        if (index >= 0) {
          storedOrders[index] = updatedOrder;
        } else {
          storedOrders.push(updatedOrder);
        }
        
        // Boyut kontrolü yap
        const dataString = JSON.stringify(storedOrders);
        const dataSize = new Blob([dataString]).size;
        const maxSize = 4 * 1024 * 1024; // 4MB
        
        if (dataSize > maxSize) {
          alert('Veri çok büyük! Lütfen bazı fotoğrafları kaldırın veya daha küçük fotoğraflar kullanın.');
          console.error('LocalStorage boyut limiti aşıldı:', dataSize, 'bytes');
          return;
        }
        
        localStorage.setItem('newOrders', dataString);
      } catch (storageError: any) {
        if (storageError.name === 'QuotaExceededError') {
          alert('Depolama alanı dolu! Lütfen bazı fotoğrafları kaldırın veya daha küçük fotoğraflar kullanın.');
        } else {
          console.error('LocalStorage güncelleme hatası:', storageError);
        }
      }
      
      // State'i güncelle
      setOrders(orders.map((o) => (o.id === updatedOrder.id ? updatedOrder : o)));
      
      // API'ye gönder (opsiyonel)
      try {
        await fetch(`https://fakestoreapi.com/carts/${updatedOrder.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedOrder),
        });
      } catch (apiError) {
        console.error('API hatası (localStorage\'da kayıtlı):', apiError);
      }
    } catch (error) {
      console.error('Sipariş güncellenirken hata:', error);
      alert('Sipariş güncellenirken bir hata oluştu!');
    }
  }, [orders, setOrders]);

  const handleOrderRowRemoved = useCallback(async (e: any) => {
    try {
      const removedOrderId = e.data.id;
      
      // LocalStorage'dan kaldır
      try {
        const stored = localStorage.getItem('newOrders');
        if (stored) {
          const storedOrders: Order[] = JSON.parse(stored);
          const filteredOrders = storedOrders.filter((o) => o.id !== removedOrderId);
          localStorage.setItem('newOrders', JSON.stringify(filteredOrders));
        }
      } catch (storageError) {
        console.error('LocalStorage silme hatası:', storageError);
      }
      
      // State'ten kaldır
      setOrders(orders.filter((o) => o.id !== removedOrderId));
      
      // Eğer silinen sipariş seçiliyse, seçimi temizle
      if (selectedOrderId === removedOrderId) {
        setSelectedOrderId(null);
      }
      
      // API'ye gönder (opsiyonel)
      try {
        await fetch(`https://fakestoreapi.com/carts/${removedOrderId}`, {
          method: 'DELETE',
        });
      } catch (apiError) {
        console.error('API hatası (localStorage\'dan silindi):', apiError);
      }
    } catch (error) {
      console.error('Sipariş silinirken hata:', error);
      alert('Sipariş silinirken bir hata oluştu!');
    }
  }, [orders, setOrders, selectedOrderId, setSelectedOrderId]);

  return {
    handleOrderRowInserted,
    handleOrderRowUpdated,
    handleOrderRowRemoved,
  };
}

