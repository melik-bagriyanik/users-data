'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import DataGrid, {
  Column,
  Editing,
  Paging,
  Selection,
  Toolbar,
  Item as GridItem,
  Scrolling,
} from 'devextreme-react/data-grid';
import Button from 'devextreme-react/button';
import { getAuthCookie } from '@/lib/cookies';
import type { User } from '../users/types';
import type { Order, OrderProduct, Product } from './types';
import OrderFilters from './components/OrderFilters';
import ImageModal from './components/ImageModal';
import { useOrders } from './hooks/useOrders';
import { useProducts } from './hooks/useProducts';

export default function OrdersPage() {
  const router = useRouter();
  const { 
    orders, 
    setOrders, 
    loading, 
    setLoading, 
    selectedOrderId, 
    setSelectedOrderId,
    getMaxOrderId 
  } = useOrders();
  const { 
    products, 
    setProducts, 
    selectedOrderProducts, 
    setSelectedOrderProducts,
    getMaxProductId 
  } = useProducts();
  const [users, setUsers] = useState<User[]>([]);
  const productGridRef = useRef<any>(null);
  
  // Filtreler
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  
  // Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string>('');


  const fetchOrders = useCallback(async () => {
    try {
      const response = await fetch('https://fakestoreapi.com/carts');
      let apiOrders: Order[] = [];
      
      if (response.ok) {
        apiOrders = await response.json();
        // API'den gelen ID'leri number'a çevir
        apiOrders = apiOrders.map((o) => ({
          ...o,
          id: typeof o.id === 'number' ? o.id : parseInt(String(o.id), 10) || 0,
        }));
      }
      
      // LocalStorage'dan yeni eklenen siparişleri al
      let storedOrders: Order[] = [];
      try {
        const stored = localStorage.getItem('newOrders');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            storedOrders = parsed;
            // Stored ID'leri number'a çevir ve products için unique key oluştur
            storedOrders = storedOrders.map((o) => {
              const order = {
                ...o,
                id: typeof o.id === 'number' ? o.id : parseInt(String(o.id), 10) || 0,
              };
              // Products için unique key oluştur
              if (order.products && Array.isArray(order.products)) {
                order.products = order.products.map((p: OrderProduct, index: number) => ({
                  ...p,
                  _uniqueKey: p._uniqueKey || `${order.id}-${p.productId}-${index}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                }));
              }
              return order;
            });
            console.log('LocalStorage\'dan yüklendi:', storedOrders.length, 'sipariş');
          } else {
            console.warn('LocalStorage verisi array değil, temizleniyor');
            localStorage.removeItem('newOrders');
          }
        }
      } catch (storageError) {
        console.error('LocalStorage okuma hatası:', storageError);
        // Hatalı veriyi temizle
        try {
          localStorage.removeItem('newOrders');
        } catch (e) {
          console.error('LocalStorage temizleme hatası:', e);
        }
      }
      
      // Birleştir - localStorage'daki siparişler öncelikli (güncel ürün listesi için)
      const uniqueOrdersMap = new Map<number, Order>();
      
      // Önce localStorage'dan gelen siparişleri ekle (öncelikli - güncel ürün listesi için)
      storedOrders.forEach((order) => {
        const id = typeof order.id === 'number' ? order.id : parseInt(String(order.id), 10) || 0;
        if (id > 0 && !uniqueOrdersMap.has(id)) {
          uniqueOrdersMap.set(id, order);
        }
      });
      
      // Sonra API'den gelen siparişleri ekle (sadece localStorage'da olmayanlar)
      apiOrders.forEach((order) => {
        const id = typeof order.id === 'number' ? order.id : parseInt(String(order.id), 10) || 0;
        if (id > 0 && !uniqueOrdersMap.has(id)) {
          uniqueOrdersMap.set(id, order);
        } else if (id > 0 && uniqueOrdersMap.has(id)) {
          // Duplicate bulundu, API'dekini atla (localStorage'dakini tut - güncel ürün listesi için)
          console.log(`Sipariş ${id} localStorage'dan yüklendi (güncel ürün listesi)`);
        }
      });
      
      // Map'ten array'e çevir ve sırala
      const uniqueOrders = Array.from(uniqueOrdersMap.values());
      uniqueOrders.sort((a, b) => a.id - b.id);
      
      // Temizlenmiş veriyi localStorage'a geri kaydet (sadece localStorage'dan gelen siparişler)
      const cleanedStoredOrders = uniqueOrders.filter((o) => 
        storedOrders.some((so) => so.id === o.id)
      );
      // localStorage'ı güncelle (güncel ürün listesi ile)
      localStorage.setItem('newOrders', JSON.stringify(cleanedStoredOrders));
      if (cleanedStoredOrders.length !== storedOrders.length) {
        console.log('Duplicate ID\'ler temizlendi. LocalStorage güncellendi.');
      }
      
      console.log('Toplam sipariş sayısı:', uniqueOrders.length, '(API:', apiOrders.length, 'LocalStorage:', storedOrders.length, 'Unique:', uniqueOrders.length, ')');
      setOrders(uniqueOrders);
    } catch (error) {
      console.error('Siparişler yüklenirken hata:', error);
    }
  }, []);

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

  useEffect(() => {
    const authData = getAuthCookie();
    if (!authData) {
      router.push('/login');
      return;
    }
    
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchOrders(), fetchUsers(), fetchProducts()]);
      setLoading(false);
    };
    
    loadData();
  }, [router, fetchOrders, fetchUsers, fetchProducts]);

  // Filtrelenmiş siparişler
  const filteredOrders = orders.filter((order) => {
    if (selectedUserId && order.userId !== selectedUserId) return false;
    
    if (startDate || endDate) {
      const orderDate = new Date(order.date);
      if (startDate && orderDate < startDate) return false;
      if (endDate && orderDate > endDate) return false;
    }
    
    return true;
  });

  // Seçili sipariş değiştiğinde ürünleri yükle
  useEffect(() => {
    if (selectedOrderId) {
      const order = orders.find((o) => o.id === selectedOrderId);
      if (order) {
        // Ürün detaylarını ekle veya mevcut product bilgisini koru
        const productsWithDetails = (order.products || []).map((op, index) => {
          // Eğer product zaten yüklenmişse koru, yoksa yükle
          let productWithDetails = { ...op };
          if (!productWithDetails.product) {
            const product = products.find((p) => p.id === op.productId);
            if (product) {
              productWithDetails.product = product;
            }
          }
          // Unique key oluştur (her zaman yeni oluştur, timestamp ve random ekle)
          // Mevcut key varsa ve unique ise koru, yoksa yeni oluştur
          if (!productWithDetails._uniqueKey) {
            productWithDetails._uniqueKey = `${selectedOrderId}-${op.productId}-${index}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          }
          return productWithDetails;
        });
        setSelectedOrderProducts(productsWithDetails);
      } else {
        // Sipariş henüz yüklenmemişse boş array göster
        setSelectedOrderProducts([]);
      }
    } else {
      setSelectedOrderProducts([]);
    }
  }, [selectedOrderId, orders, products]);

  const handleOrderSelectionChanged = (e: any) => {
    const selectedRowKeys = e.selectedRowKeys;
    if (selectedRowKeys && selectedRowKeys.length > 0) {
      setSelectedOrderId(selectedRowKeys[0] as number);
    } else {
      setSelectedOrderId(null);
    }
  };

  const handleOrderRowInserted = async (e: any) => {
    try {
      const newOrder = { ...e.data };
      
      // ID'yi otomatik oluştur (en yüksek ID + 1)
      const maxId = getMaxOrderId();
      const newId = maxId + 1;
      newOrder.id = newId;
      
      // ID kontrolü - aynı ID'ye sahip sipariş var mı? (hem state hem localStorage'dan kontrol et)
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
        // Eğer ID çakışıyorsa, bir sonraki boş ID'yi bul
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
      
      // UserId yoksa veya 0 ise, varsayılan olarak 1 ekle (kullanıcı girebilir)
      if (!newOrder.userId || newOrder.userId === 0) {
        newOrder.userId = 1;
      }
      
      // ÖNCE LocalStorage'a kaydet - bu çok önemli!
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
        
        // Yeni siparişi ekle
        storedOrders.push(newOrder);
        
        // LocalStorage'a kaydet
        localStorage.setItem('newOrders', JSON.stringify(storedOrders));
        console.log('LocalStorage\'a kaydedildi:', newOrder.id, storedOrders.length);
      } catch (storageError) {
        console.error('LocalStorage yazma hatası:', storageError);
        alert('Sipariş kaydedilemedi! Lütfen tekrar deneyin.');
        return;
      }
      
      // State'i güncelle
      const updatedOrders = [...orders, newOrder];
      setOrders(updatedOrders);
      
      // Yeni eklenen siparişi otomatik seç
      // State güncellemesi asenkron olduğu için setTimeout kullan
      setTimeout(() => {
        setSelectedOrderId(newOrder.id);
        // Alt grid'de otomatik olarak yeni ürün ekleme modunu aç
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
      
      // API'ye gönder (opsiyonel - başarısız olsa da localStorage'da var)
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
  };

  const handleOrderRowUpdated = async (e: any) => {
    try {
      const updatedOrder = e.data;
      updatedOrder.id = Number(updatedOrder.id);
      
      // ID kontrolü - aynı ID'ye sahip başka sipariş var mı? (hem state hem localStorage'dan kontrol et)
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
      
      // Eğer aynı ID'ye sahip birden fazla sipariş varsa (kendisi hariç) hata
      const totalSameId = ordersWithSameIdInState.length + ordersWithSameIdInStorage.length;
      if (totalSameId > 1) {
        // Eğer güncellenen sipariş zaten listede varsa ve ID değişmemişse sorun yok
        // Ama eğer ID değiştirilmişse ve başka bir siparişte aynı ID varsa hata
        const isCurrentOrder = ordersWithSameIdInState.some((o) => {
          // Basit kontrol: eğer tüm özellikler aynıysa bu mevcut sipariş
          return o.userId === updatedOrder.userId && 
                 o.date === updatedOrder.date;
        });
        if (!isCurrentOrder) {
          alert(`ID ${updatedOrder.id} zaten kullanılıyor! Lütfen farklı bir ID kullanın.`);
          return;
        }
      }
      
      // LocalStorage'ı güncelle
      try {
        const stored = localStorage.getItem('newOrders');
        if (stored) {
          const storedOrders: Order[] = JSON.parse(stored);
          const index = storedOrders.findIndex((o) => o.id === updatedOrder.id);
          if (index >= 0) {
            storedOrders[index] = updatedOrder;
            localStorage.setItem('newOrders', JSON.stringify(storedOrders));
          }
        }
      } catch (storageError) {
        console.error('LocalStorage güncelleme hatası:', storageError);
      }
      
      // State'i güncelle
      setOrders(orders.map((o) => (o.id === updatedOrder.id ? updatedOrder : o)));
      
      // API'ye gönder
      try {
        await fetch(`https://fakestoreapi.com/carts/${updatedOrder.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedOrder),
        });
      } catch (apiError) {
        console.error('API güncelleme hatası:', apiError);
      }
    } catch (error) {
      console.error('Sipariş güncellenirken hata:', error);
    }
  };

  const handleOrderRowRemoved = async (e: any) => {
    try {
      const orderId = Number(e.data.id);
      
      // LocalStorage'dan sil
      try {
        const stored = localStorage.getItem('newOrders');
        if (stored) {
          const storedOrders: Order[] = JSON.parse(stored);
          const filtered = storedOrders.filter((o) => o.id !== orderId);
          localStorage.setItem('newOrders', JSON.stringify(filtered));
        }
      } catch (storageError) {
        console.error('LocalStorage silme hatası:', storageError);
      }
      
      // State'den sil
      setOrders(orders.filter((o) => o.id !== orderId));
      setSelectedOrderId(null);
      
      // API'den sil
      try {
        await fetch(`https://fakestoreapi.com/carts/${orderId}`, {
          method: 'DELETE',
        });
      } catch (apiError) {
        console.error('API silme hatası:', apiError);
      }
    } catch (error) {
      console.error('Sipariş silinirken hata:', error);
    }
  };

  const handleProductRowInserted = async (e: any) => {
    if (!selectedOrderId) return;
    
    try {
      const newProduct = e.data;
      const order = orders.find((o) => o.id === selectedOrderId);
      if (order) {
        // Eğer productId yoksa veya 0 ise, otomatik ID oluştur
        if (!newProduct.productId || newProduct.productId === 0) {
          const maxProductId = getMaxProductId(orders, products);
          newProduct.productId = maxProductId + 1;
        }
        
        // Aynı productId'ye sahip ürün var mı kontrol et
        if (newProduct.productId) {
          const existingProduct = (order.products || []).find(
            (p) => p.productId === newProduct.productId
          );
          if (existingProduct) {
            // Eğer duplicate varsa, bir sonraki boş ID'yi bul
            let nextId = newProduct.productId + 1;
            while ((order.products || []).some((p) => p.productId === nextId)) {
              nextId++;
            }
            newProduct.productId = nextId;
          }
        }
        
        // Ürün bilgilerini yükle (productId varsa)
        let productWithDetails = { ...newProduct };
        if (newProduct.productId && products.length > 0) {
          const product = products.find((p) => p.id === newProduct.productId);
          if (product) {
            productWithDetails.product = product;
            // Eğer title ve price yoksa product'tan kopyala
            if (!productWithDetails.title) {
              productWithDetails.title = product.title;
            }
            if (productWithDetails.price === undefined) {
              productWithDetails.price = product.price;
            }
          }
        }
        
        // Unique key oluştur (timestamp ve random ekle)
        const productCount = (order.products || []).length;
        productWithDetails._uniqueKey = `${selectedOrderId}-${newProduct.productId}-${productCount}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        const updatedProducts = [...(order.products || []), productWithDetails];
        const updatedOrder = { ...order, products: updatedProducts };
        
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
          
          const index = storedOrders.findIndex((o) => o.id === selectedOrderId);
          if (index >= 0) {
            storedOrders[index] = updatedOrder;
          } else {
            // Eğer localStorage'da yoksa ekle
            storedOrders.push(updatedOrder);
          }
          
          // Boyut kontrolü yap
          const dataString = JSON.stringify(storedOrders);
          const dataSize = new Blob([dataString]).size;
          const maxSize = 4 * 1024 * 1024; // 4MB (localStorage genellikle 5-10MB limit)
          
          if (dataSize > maxSize) {
            alert('Veri çok büyük! Lütfen bazı fotoğrafları kaldırın veya daha küçük fotoğraflar kullanın.');
            console.error('LocalStorage boyut limiti aşıldı:', dataSize, 'bytes');
            // Yine de state'i güncelle (localStorage olmadan)
            setOrders(orders.map((o) => (o.id === selectedOrderId ? updatedOrder : o)));
            return;
          }
          
          localStorage.setItem('newOrders', dataString);
          console.log('Ürün eklendi, localStorage güncellendi:', newProduct.productId);
        } catch (storageError: any) {
          if (storageError.name === 'QuotaExceededError') {
            alert('Depolama alanı dolu! Lütfen bazı fotoğrafları kaldırın veya daha küçük fotoğraflar kullanın.');
            // Yine de state'i güncelle (localStorage olmadan)
            setOrders(orders.map((o) => (o.id === selectedOrderId ? updatedOrder : o)));
          } else {
            console.error('LocalStorage güncelleme hatası:', storageError);
          }
        }
        
        // State'i güncelle
        setOrders(orders.map((o) => (o.id === selectedOrderId ? updatedOrder : o)));
        
        // API'ye gönder (opsiyonel)
        try {
          await fetch(`https://fakestoreapi.com/carts/${selectedOrderId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedOrder),
          });
        } catch (apiError) {
          console.error('API hatası:', apiError);
        }
      }
    } catch (error) {
      console.error('Ürün eklenirken hata:', error);
    }
  };

  const handleProductRowUpdated = async (e: any) => {
    if (!selectedOrderId) return;
    
    try {
      // DevExpress'ten gelen veri yapısını kontrol et
      // onRowUpdated event'inde: e.data = yeni veri, e.key = satır key'i, e.oldData = eski veri
      const updatedProduct = e.data || e.newData || e.row?.data;
      const uniqueKey = e.key || updatedProduct?._uniqueKey;
      
      console.log('handleProductRowUpdated çağrıldı:', { 
        key: e.key, 
        data: e.data, 
        newData: e.newData,
        oldData: e.oldData,
        updatedProduct,
        uniqueKey 
      });
      
      if (!uniqueKey) {
        console.error('Güncellenecek ürün key bulunamadı:', e);
        return;
      }
      
      const order = orders.find((o) => o.id === selectedOrderId);
      if (!order) {
        console.error('Sipariş bulunamadı:', selectedOrderId);
        return;
      }
      
      // Mevcut ürünü bul
      const currentProduct = (order.products || []).find(
        (p) => p._uniqueKey === uniqueKey
      );
      
      if (!currentProduct) {
        console.error('Güncellenecek ürün siparişte bulunamadı:', uniqueKey);
        return;
      }
      
      // ProductId değiştiyse, aynı productId'ye sahip başka ürün var mı kontrol et
      if (updatedProduct.productId && 
          currentProduct.productId !== updatedProduct.productId) {
        const existingProduct = (order.products || []).find(
          (p) => p.productId === updatedProduct.productId && p._uniqueKey !== uniqueKey
        );
        if (existingProduct) {
          alert(`Bu siparişte zaten productId ${updatedProduct.productId} bulunuyor! Lütfen farklı bir ürün ID kullanın.`);
          return;
        }
      }
      
      // Ürün bilgilerini yükle (productId değiştiyse)
      // Eğer updatedProduct yoksa, e.data veya e.newData'dan al
      const newProductData = updatedProduct || e.data || e.newData || {};
      
      // Mevcut ürün verisini koru ve yeni verilerle birleştir
      let productWithDetails = {
        ...currentProduct,
        ...newProductData,
        _uniqueKey: uniqueKey, // Unique key'i her zaman koru
      };
      
      // ProductId varsa ve değiştiyse, yeni product bilgisini yükle
      if (productWithDetails.productId && products.length > 0) {
        const product = products.find((p) => p.id === productWithDetails.productId);
        if (product) {
          productWithDetails.product = product;
          // Eğer title ve price yoksa product'tan kopyala
          if (!productWithDetails.title) {
            productWithDetails.title = product.title;
          }
          if (productWithDetails.price === undefined) {
            productWithDetails.price = product.price;
          }
        } else {
          // Eğer product bulunamazsa, mevcut product'ı koru
          productWithDetails.product = currentProduct.product;
        }
      } else if (currentProduct.product) {
        // Eğer productId yoksa ama mevcut product varsa koru
        productWithDetails.product = currentProduct.product;
        // Eğer title ve price yoksa mevcut product'tan kopyala
        if (!productWithDetails.title) {
          productWithDetails.title = currentProduct.title || currentProduct.product.title;
        }
        if (productWithDetails.price === undefined) {
          productWithDetails.price = currentProduct.price !== undefined ? currentProduct.price : currentProduct.product.price;
        }
      }
      
      // Quantity'yi number'a çevir
      if (productWithDetails.quantity !== undefined) {
        productWithDetails.quantity = Number(productWithDetails.quantity) || 1;
      }
      
      // ProductId'yi number'a çevir
      if (productWithDetails.productId !== undefined) {
        productWithDetails.productId = Number(productWithDetails.productId) || 0;
      }
      
      console.log('Ürün güncelleniyor:', {
        uniqueKey,
        currentProduct,
        productWithDetails
      });
      
      const updatedProducts = (order.products || []).map((p) =>
        p._uniqueKey === uniqueKey ? productWithDetails : p
      );
      const updatedOrder = { ...order, products: updatedProducts };
      
      // LocalStorage'ı güncelle - HER ZAMAN localStorage'a kaydet
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
        
        const index = storedOrders.findIndex((o) => o.id === selectedOrderId);
        if (index >= 0) {
          storedOrders[index] = updatedOrder;
        } else {
          // Eğer localStorage'da yoksa ekle (API'den gelen siparişler için)
          storedOrders.push(updatedOrder);
        }
        
        localStorage.setItem('newOrders', JSON.stringify(storedOrders));
        console.log('Ürün güncellendi, localStorage güncellendi. Sipariş ID:', selectedOrderId, 'Ürün ID:', updatedProduct.productId);
      } catch (storageError) {
        console.error('LocalStorage güncelleme hatası:', storageError);
        alert('Ürün güncellenirken bir hata oluştu!');
        return;
      }
      
      // State'i güncelle
      const updatedOrders = orders.map((o) => (o.id === selectedOrderId ? updatedOrder : o));
      setOrders(updatedOrders);
      
      // selectedOrderProducts state'ini de güncelle
      const updatedSelectedProducts = updatedProducts.map((op, index) => {
        let productWithDetails = { ...op };
        if (!productWithDetails.product && op.productId) {
          const product = products.find((p) => p.id === op.productId);
          if (product) {
            productWithDetails.product = product;
          }
        }
        if (!productWithDetails._uniqueKey) {
          productWithDetails._uniqueKey = `${selectedOrderId}-${op.productId}-${index}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        }
        return productWithDetails;
      });
      setSelectedOrderProducts(updatedSelectedProducts);
      
      // API'ye gönder (opsiyonel)
      try {
        await fetch(`https://fakestoreapi.com/carts/${selectedOrderId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedOrder),
        });
      } catch (apiError) {
        console.error('API hatası:', apiError);
      }
    } catch (error) {
      console.error('Ürün güncellenirken hata:', error);
      alert('Ürün güncellenirken bir hata oluştu!');
    }
  };

  const handleProductRowRemoved = async (e: any) => {
    if (!selectedOrderId) return;
    
    try {
      // DevExpress'ten gelen veri yapısını kontrol et
      const removedProduct = e.data || e.row?.data || e.key;
      const uniqueKey = removedProduct?._uniqueKey || e.key;
      
      if (!uniqueKey) {
        console.error('Silinecek ürün bulunamadı:', e);
        return;
      }
      
      const order = orders.find((o) => o.id === selectedOrderId);
      if (!order) {
        console.error('Sipariş bulunamadı:', selectedOrderId);
        return;
      }
      
      // Unique key'e göre sil
      let updatedProducts = (order.products || []).filter(
        (p) => p._uniqueKey !== uniqueKey
      );
      
      // Eğer hiçbir ürün silinmediyse, productId ile de dene
      if (updatedProducts.length === (order.products || []).length && removedProduct?.productId) {
        updatedProducts = (order.products || []).filter(
          (p) => p.productId !== removedProduct.productId
        );
      }
      
      const updatedOrder = { ...order, products: updatedProducts };
      
      // LocalStorage'ı güncelle - HER ZAMAN localStorage'a kaydet (API'den gelen siparişler için de)
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
        
        const index = storedOrders.findIndex((o) => o.id === selectedOrderId);
        if (index >= 0) {
          // Mevcut siparişi güncelle
          storedOrders[index] = updatedOrder;
        } else {
          // Eğer localStorage'da yoksa ekle (API'den gelen siparişler için)
          storedOrders.push(updatedOrder);
        }
        
        localStorage.setItem('newOrders', JSON.stringify(storedOrders));
        console.log('Ürün silindi, localStorage güncellendi. Sipariş ID:', selectedOrderId, 'Kalan ürün sayısı:', updatedProducts.length);
      } catch (storageError) {
        console.error('LocalStorage güncelleme hatası:', storageError);
        alert('Ürün silinirken bir hata oluştu!');
        return;
      }
      
      // State'i güncelle
      const updatedOrders = orders.map((o) => (o.id === selectedOrderId ? updatedOrder : o));
      setOrders(updatedOrders);
      
      // selectedOrderProducts state'ini de güncelle
      const updatedSelectedProducts = updatedProducts.map((op, index) => {
        let productWithDetails = { ...op };
        if (!productWithDetails.product && op.productId) {
          const product = products.find((p) => p.id === op.productId);
          if (product) {
            productWithDetails.product = product;
          }
        }
        if (!productWithDetails._uniqueKey) {
          productWithDetails._uniqueKey = `${selectedOrderId}-${op.productId}-${index}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        }
        return productWithDetails;
      });
      setSelectedOrderProducts(updatedSelectedProducts);
      
      // API'ye gönder (opsiyonel)
      try {
        await fetch(`https://fakestoreapi.com/carts/${selectedOrderId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedOrder),
        });
      } catch (apiError) {
        console.error('API hatası:', apiError);
      }
    } catch (error) {
      console.error('Ürün silinirken hata:', error);
      alert('Ürün silinirken bir hata oluştu!');
    }
  };

  const handleShowImage = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setModalVisible(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, rowData: OrderProduct) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Dosya tipini kontrol et
    if (!file.type.startsWith('image/')) {
      alert('Lütfen bir resim dosyası seçin!');
      return;
    }

    // Dosya boyutunu kontrol et (max 1MB - localStorage için daha küçük)
    if (file.size > 1 * 1024 * 1024) {
      alert('Dosya boyutu 1MB\'dan küçük olmalıdır!');
      return;
    }

    if (!selectedOrderId) {
      alert('Lütfen önce bir sipariş seçin!');
      return;
    }

    try {
      // Resmi sıkıştır ve küçült
      const compressImage = (file: File, maxWidth: number = 800, maxHeight: number = 800, quality: number = 0.7): Promise<string> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
              const canvas = document.createElement('canvas');
              let width = img.width;
              let height = img.height;

              // Boyutları orantılı olarak küçült
              if (width > height) {
                if (width > maxWidth) {
                  height = (height * maxWidth) / width;
                  width = maxWidth;
                }
              } else {
                if (height > maxHeight) {
                  width = (width * maxHeight) / height;
                  height = maxHeight;
                }
              }

              canvas.width = width;
              canvas.height = height;

              const ctx = canvas.getContext('2d');
              if (!ctx) {
                reject(new Error('Canvas context alınamadı'));
                return;
              }

              ctx.drawImage(img, 0, 0, width, height);
              const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
              resolve(compressedBase64);
            };
            img.onerror = reject;
            img.src = event.target?.result as string;
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      };

      // Resmi sıkıştır
      const base64Image = await compressImage(file);
      
      // State'i güncelle - mevcut orders state'ini kullan
      const order = orders.find((o) => o.id === selectedOrderId);
      if (!order) {
        console.error('Sipariş bulunamadı:', selectedOrderId);
        return;
      }

      // Ürünü bul ve güncelle (yeni eklenen ürünler için de çalışmalı)
      // Önce _uniqueKey ile bul, yoksa productId ile bul
      let productIndex = -1;
      let productToUpdate: OrderProduct | null = null;
      
      if (rowData._uniqueKey) {
        productIndex = (order.products || []).findIndex(
          (p) => p._uniqueKey === rowData._uniqueKey
        );
        if (productIndex >= 0) {
          productToUpdate = order.products[productIndex];
        }
      }
      
      // Eğer _uniqueKey ile bulunamadıysa, productId ile dene (yeni eklenen ürünler için)
      if (productIndex === -1 && rowData.productId) {
        // En son eklenen ürünü bul (aynı productId'ye sahip en son ürün)
        // Önce _uniqueKey'i olmayan ürünleri kontrol et (yeni eklenenler)
        const productsWithoutKey = (order.products || []).filter(
          (p) => !p._uniqueKey && p.productId === rowData.productId
        );
        if (productsWithoutKey.length > 0) {
          // En son eklenen ürünü al
          const lastProduct = productsWithoutKey[productsWithoutKey.length - 1];
          productIndex = (order.products || []).lastIndexOf(lastProduct);
          if (productIndex >= 0) {
            productToUpdate = order.products[productIndex];
          }
        } else {
          // _uniqueKey'i olan ürünleri kontrol et
          const productsWithSameId = (order.products || []).filter(
            (p) => p.productId === rowData.productId
          );
          if (productsWithSameId.length > 0) {
            // En son eklenen ürünü al (en son index'teki)
            const lastIndex = (order.products || []).lastIndexOf(productsWithSameId[productsWithSameId.length - 1]);
            if (lastIndex >= 0) {
              productIndex = lastIndex;
              productToUpdate = order.products[lastIndex];
            }
          }
        }
      }
      
      if (productIndex === -1 || !productToUpdate) {
        // rowData boşsa veya yeterli bilgi yoksa, selectedOrderProducts'tan en son eklenen ürünü bul
        // (yeni eklenen ve henüz kaydedilmemiş ürünler için)
        let targetProduct: OrderProduct | null = null;
        
        if (!rowData || Object.keys(rowData).length === 0 || !rowData.productId) {
          // selectedOrderProducts'tan en son eklenen ve henüz kaydedilmemiş ürünü bul
          // _uniqueKey'i olmayan veya en son eklenen ürünü al
          const productsWithoutKey = selectedOrderProducts.filter((p) => !p._uniqueKey || !order.products.find((op) => op._uniqueKey === p._uniqueKey));
          if (productsWithoutKey.length > 0) {
            targetProduct = productsWithoutKey[productsWithoutKey.length - 1];
          } else if (selectedOrderProducts.length > 0) {
            // En son eklenen ürünü al
            targetProduct = selectedOrderProducts[selectedOrderProducts.length - 1];
          }
        } else if (rowData.productId) {
          // rowData'da productId varsa, onu kullan
          targetProduct = rowData;
        }
        
        if (targetProduct && targetProduct.productId) {
          // Ürünü bul veya yeni ürün olarak ekle
          const existingIndex = (order.products || []).findIndex(
            (p) => p.productId === targetProduct!.productId && (!p._uniqueKey || p._uniqueKey === targetProduct!._uniqueKey)
          );
          
          if (existingIndex >= 0) {
            // Mevcut ürünü güncelle
            productIndex = existingIndex;
            productToUpdate = order.products[existingIndex];
          } else {
            // Yeni ürün olarak ekle
            const newProduct: OrderProduct = {
              ...targetProduct,
              image: base64Image,
              product: {
                ...(targetProduct.product || {} as Product),
                image: base64Image,
              } as Product,
            };
            
            // _uniqueKey yoksa oluştur
            if (!newProduct._uniqueKey) {
              const productCount = (order.products || []).length;
              newProduct._uniqueKey = `${selectedOrderId}-${newProduct.productId}-${productCount}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            }
            
            const updatedProducts = [...(order.products || []), newProduct];
            const updatedOrder = { ...order, products: updatedProducts };
            
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
              
              const index = storedOrders.findIndex((o) => o.id === selectedOrderId);
              if (index >= 0) {
                storedOrders[index] = updatedOrder;
              } else {
                storedOrders.push(updatedOrder);
              }
              
              // Boyut kontrolü yap
              const dataString = JSON.stringify(storedOrders);
              const dataSize = new Blob([dataString]).size;
              const maxSize = 4 * 1024 * 1024; // 4MB (localStorage genellikle 5-10MB limit)
              
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
            const updatedOrders = orders.map((o) => (o.id === selectedOrderId ? updatedOrder : o));
            setOrders(updatedOrders);
            
            // selectedOrderProducts state'ini de güncelle
            const updatedSelectedProducts = updatedProducts.map((op, index) => {
              let productWithDetails = { ...op };
              if (!productWithDetails.product && op.productId) {
                const product = products.find((p) => p.id === op.productId);
                if (product) {
                  productWithDetails.product = product;
                }
              }
              if (!productWithDetails._uniqueKey) {
                productWithDetails._uniqueKey = `${selectedOrderId}-${op.productId}-${index}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
              }
              return productWithDetails;
            });
            setSelectedOrderProducts(updatedSelectedProducts);
            return;
          }
        } else {
          console.warn('Fotoğraf yüklemek için ürün bulunamadı. Lütfen önce ürün bilgilerini girin.');
          return;
        }
      }

      // Ürünü güncelle (immutable update)
      const updatedProduct: OrderProduct = {
        ...productToUpdate,
        image: base64Image,
        product: {
          ...(productToUpdate.product || {} as Product),
          image: base64Image,
        } as Product,
      };

      const updatedProducts = [...(order.products || [])];
      updatedProducts[productIndex] = updatedProduct;
      const updatedOrder = { ...order, products: updatedProducts };
      
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
        
        const index = storedOrders.findIndex((o) => o.id === selectedOrderId);
        if (index >= 0) {
          storedOrders[index] = updatedOrder;
        } else {
          storedOrders.push(updatedOrder);
        }
        
        // Boyut kontrolü yap
        const dataString = JSON.stringify(storedOrders);
        const dataSize = new Blob([dataString]).size;
        const maxSize = 4 * 1024 * 1024; // 4MB (localStorage genellikle 5-10MB limit)
        
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
      const updatedOrders = orders.map((o) => (o.id === selectedOrderId ? updatedOrder : o));
      setOrders(updatedOrders);
      
      // selectedOrderProducts state'ini de güncelle
      const updatedSelectedProducts = updatedProducts.map((op, index) => {
        let productWithDetails = { ...op };
        if (!productWithDetails.product && op.productId) {
          const product = products.find((p) => p.id === op.productId);
          if (product) {
            productWithDetails.product = product;
          }
        }
        if (!productWithDetails._uniqueKey) {
          productWithDetails._uniqueKey = `${selectedOrderId}-${op.productId}-${index}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        }
        return productWithDetails;
      });
      setSelectedOrderProducts(updatedSelectedProducts);
    } catch (error) {
      console.error('Fotoğraf yüklenirken hata:', error);
      alert('Fotoğraf yüklenirken bir hata oluştu!');
    }
  };

  const handleClearFilters = () => {
    setStartDate(null);
    setEndDate(null);
    setSelectedUserId(null);
  };


  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between rounded-lg bg-white p-6 shadow">
          <h1 className="text-2xl font-bold text-gray-800">Siparişler</h1>
          <Button
            text="Kullanıcı Listesi"
            stylingMode="outlined"
            onClick={() => router.push('/users')}
          />
        </div>

        {/* Filtreler */}
        <OrderFilters
          startDate={startDate}
          endDate={endDate}
          selectedUserId={selectedUserId}
          users={users}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          onUserIdChange={setSelectedUserId}
          onClearFilters={handleClearFilters}
        />

        {/* Ana Grid ve Ürün Grid - Yan Yana */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Ana Sipariş Grid */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-semibold text-gray-800">Sipariş Listesi</h2>
            <DataGrid
              dataSource={filteredOrders}
              keyExpr="id"
              showBorders={true}
              height="600px"
              onSelectionChanged={handleOrderSelectionChanged}
              selectedRowKeys={selectedOrderId ? [selectedOrderId] : []}
              onRowInserted={handleOrderRowInserted}
              onRowUpdated={handleOrderRowUpdated}
              onRowRemoved={handleOrderRowRemoved}
              onRowRemoving={(e: any) => {
                // Confirmation dialog göster
                const confirmed = window.confirm('Bu siparişi silmek istediğinizden emin misiniz?');
                if (!confirmed) {
                  e.cancel = true;
                }
              }}
              onRowClick={(e: any) => {
                // Satıra tıklandığında seç
                if (e.data && e.data.id) {
                  setSelectedOrderId(e.data.id);
                }
              }}
            >
              <Selection mode="single" />
              <Scrolling mode="virtual" />
              <Paging enabled={true} pageSize={10} />
              <Editing
                mode="row"
                allowAdding={true}
                allowDeleting={true}
                allowUpdating={true}
                useIcons={true}
                confirmDelete={true}
                texts={{
                  confirmDeleteMessage: 'Bu siparişi silmek istediğinizden emin misiniz?',
                  yes: 'Evet',
                  no: 'Hayır',
                }}
              />
              <Toolbar>
                <GridItem name="addRowButton" />
                <GridItem 
                  name="saveButton" 
                  options={{ 
                    icon: 'save', 
                    hint: 'Kaydet',
                    stylingMode: 'text'
                  }} 
                />
                <GridItem 
                  name="cancelButton" 
                  options={{ 
                    icon: 'close', 
                    hint: 'İptal',
                    stylingMode: 'text'
                  }} 
                />
              </Toolbar>

              <Column 
                dataField="id" 
                caption="ID" 
                width={50} 
                allowEditing={false}
                dataType="number"
              />
              <Column
                dataField="userId"
                caption="Kullanıcı ID"
                width={90}
                dataType="number"
                allowEditing={true}
                editorType="dxNumberBox"
                editorOptions={{
                  min: 1,
                  showSpinButtons: true,
                }}
              />
              <Column
                dataField="date"
                caption="Tarih"
                width={100}
                dataType="date"
                editorOptions={{
                  type: 'date'
                }}
              />
              <Column
                dataField="orderType"
                caption="Sipariş Türü"
                width={150}
              />
              <Column
                dataField="products"
                caption="Ürün Sayısı"
                width={90}
                allowEditing={false}
                calculateCellValue={(rowData: Order) => {
                  if (Array.isArray(rowData.products)) {
                    return rowData.products.length;
                  }
                  return 0;
                }}
              />
              <Column
                type="buttons"
                width={80}
                buttons={[
                  {
                    name: 'edit',
                    icon: 'edit',
                  },
                  {
                    name: 'delete',
                    icon: 'trash',
                  },
                ]}
              />
            </DataGrid>
          </div>

          {/* Ürün Grid - Yanında */}
          <div className="rounded-lg bg-white p-6 shadow">
            {selectedOrderId ? (
              <>
                <div className="mb-4">
                  <h2 className="text-xl font-semibold text-gray-800">
                    Sipariş Ürünleri
                  </h2>
                  <p className="mt-1 text-sm text-gray-600">
                    Sipariş ID: {selectedOrderId}
                  </p>
                </div>
                <DataGrid
                  ref={productGridRef}
                  dataSource={selectedOrderProducts}
                  keyExpr="_uniqueKey"
                  showBorders={true}
                  height="600px"
                  onRowInserted={handleProductRowInserted}
                  onRowUpdated={handleProductRowUpdated}
                  onRowRemoved={handleProductRowRemoved}
                  onRowRemoving={(e: any) => {
                    // Confirmation dialog göster
                    const confirmed = window.confirm('Bu ürünü silmek istediğinizden emin misiniz?');
                    if (!confirmed) {
                      e.cancel = true;
                    }
                  }}
                  onSaving={async (e: any) => {
                    // Satır kaydedilmeden önce güncelleme yap
                    if (!selectedOrderId) {
                      e.cancel = true;
                      return;
                    }
                    
                    try {
                      const updatedProduct = e.newData || e.data;
                      const uniqueKey = e.key;
                      
                      if (!uniqueKey) {
                        console.error('onRowSaving: Key bulunamadı');
                        return;
                      }
                      
                      const order = orders.find((o) => o.id === selectedOrderId);
                      if (!order) {
                        console.error('onRowSaving: Sipariş bulunamadı');
                        e.cancel = true;
                        return;
                      }
                      
                      const currentProduct = (order.products || []).find(
                        (p) => p._uniqueKey === uniqueKey
                      );
                      
                      if (!currentProduct) {
                        console.error('onRowSaving: Ürün bulunamadı');
                        return;
                      }
                      
                      // ProductId değiştiyse kontrol et
                      if (updatedProduct?.productId && 
                          currentProduct.productId !== updatedProduct.productId) {
                        const existingProduct = (order.products || []).find(
                          (p) => p.productId === updatedProduct.productId && p._uniqueKey !== uniqueKey
                        );
                        if (existingProduct) {
                          alert(`Bu siparişte zaten productId ${updatedProduct.productId} bulunuyor!`);
                          e.cancel = true;
                          return;
                        }
                      }
                      
                      // Güncelleme işlemini handleProductRowUpdated'a bırak
                      // Burada sadece validasyon yapıyoruz
                    } catch (error) {
                      console.error('onRowSaving hatası:', error);
                      e.cancel = true;
                    }
                  }}
                >
                  <Scrolling mode="standard" />
                  <Paging enabled={true} pageSize={10} />
                  <Editing
                    mode="row"
                    allowAdding={true}
                    allowDeleting={true}
                    allowUpdating={true}
                    useIcons={true}
                    confirmDelete={true}
                    texts={{
                      confirmDeleteMessage: 'Bu ürünü silmek istediğinizden emin misiniz?',
                      yes: 'Evet',
                      no: 'Hayır',
                    }}
                  />
                  <Toolbar>
                    <GridItem name="addRowButton" />
                    <GridItem 
                      name="saveButton" 
                      options={{ 
                        icon: 'save', 
                        hint: 'Kaydet',
                        stylingMode: 'text'
                      }} 
                    />
                    <GridItem 
                      name="cancelButton" 
                      options={{ 
                        icon: 'close', 
                        hint: 'İptal',
                        stylingMode: 'text'
                      }} 
                    />
                  </Toolbar>

                  <Column
                    dataField="productId"
                    caption="Ürün ID"
                    width={70}
                    dataType="number"
                    allowEditing={false}
                  />
                  <Column
                    dataField="quantity"
                    caption="Miktar"
                    width={70}
                    dataType="number"
                    editorOptions={{ 
                      valueType: 'number',
                      min: 1,
                      step: 1,
                      format: '#',
                      useSpinButtons: true
                    }}
                    setCellValue={(rowData: OrderProduct, value: any) => {
                      const numValue = Number(value);
                      if (!isNaN(numValue) && numValue > 0) {
                        rowData.quantity = Math.floor(numValue);
                      }
                    }}
                  />
                  <Column
                    dataField="title"
                    caption="Ürün Adı"
                    width="*"
                    setCellValue={(rowData: OrderProduct, value: any) => {
                      rowData.title = value;
                    }}
                    calculateCellValue={(rowData: OrderProduct) => {
                      if (rowData.title && rowData.title.trim() !== '') {
                        return rowData.title;
                      }
                      if (rowData.product?.title && rowData.product.title.trim() !== '') {
                        return rowData.product.title;
                      }
                      return '';
                    }}
                    cellRender={(data: any) => {
                      const value = data.value || '';
                      if (value === '' || value === '-') {
                        return '';
                      }
                      return value;
                    }}
                  />
                  <Column
                    dataField="price"
                    caption="Fiyat"
                    width={80}
                    dataType="number"
                    format="currency"
                    editorOptions={{ 
                      valueType: 'number',
                      min: 0
                    }}
                    setCellValue={(rowData: OrderProduct, value: any) => {
                      rowData.price = value ? Number(value) : undefined;
                    }}
                    calculateCellValue={(rowData: OrderProduct) =>
                      rowData.price !== undefined ? rowData.price : (rowData.product?.price || 0)
                    }
                  />
                  <Column
                    dataField="product.image"
                    caption="Fotoğraf"
                    width={80}
                    allowEditing={false}
                    cellRender={(data: any) => {
                      const rowData = data.data as OrderProduct;
                      const imageUrl = rowData.image || rowData.product?.image;
                      
                      if (imageUrl) {
                        return (
                          <div className="flex items-center justify-center p-1">
                            <img
                              src={imageUrl}
                              alt={rowData.title || rowData.product?.title || 'Ürün'}
                              className="h-10 w-10 cursor-pointer rounded border border-gray-200 object-cover shadow-sm transition-transform hover:scale-110"
                              onClick={() => handleShowImage(imageUrl)}
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="40" height="40"%3E%3Crect fill="%23e5e7eb" width="40" height="40"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%239ca3af" font-size="8"%3EYok%3C/text%3E%3C/svg%3E';
                              }}
                            />
                          </div>
                        );
                      }
                      const fileInputId = `file-input-${rowData._uniqueKey || Math.random()}`;
                      return (
                        <div className="flex items-center justify-center p-1">
                          <input
                            id={fileInputId}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleImageUpload(e, rowData)}
                          />
                          <Button
                            text="Fotoğraf Ekle"
                            stylingMode="outlined"
                            icon="image"
                            width={100}
                            onClick={(e: any) => {
                              e.event?.stopPropagation();
                              e.event?.preventDefault();
                              // File input'u tetikle
                              const input = document.getElementById(fileInputId) as HTMLInputElement;
                              if (input) {
                                input.click();
                              }
                            }}
                          />
                        </div>
                      );
                    }}
                  />
                  <Column
                    type="buttons"
                    width={100}
                    buttons={[
                      {
                        name: 'edit',
                        icon: 'edit',
                      },
                      {
                        name: 'delete',
                        icon: 'trash',
                      },
                      {
                        name: 'save',
                        icon: 'save',
                      },
                      {
                        name: 'cancel',
                        icon: 'close',
                      },
                    ]}
                  />
                </DataGrid>
              </>
            ) : (
              <div className="flex h-[600px] items-center justify-center">
                <div className="text-center">
                  <p className="text-lg text-gray-500">
                    Ürünleri görmek için bir sipariş seçin
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Fotoğraf Modal */}
        <ImageModal
          visible={modalVisible}
          imageUrl={selectedImage}
          onClose={() => setModalVisible(false)}
        />
      </div>
    </div>
  );
}
