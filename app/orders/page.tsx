'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Button from 'devextreme-react/button';
import { getAuthCookie } from '@/lib/cookies';
import type { Order, OrderProduct } from './types';
import OrderFilters from './components/OrderFilters';
import OrderGrid from './components/OrderGrid';
import ProductGrid from './components/ProductGrid';
import ImageModal from './components/ImageModal';
import { useOrders } from './hooks/useOrders';
import { useProducts } from './hooks/useProducts';
import { useOrderData } from './hooks/useOrderData';
import { useOrderHandlers } from './hooks/useOrderHandlers';
import { useProductHandlers } from './hooks/useProductHandlers';

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
    selectedOrderProducts, 
    setSelectedOrderProducts,
    getMaxProductId 
  } = useProducts();
  const {
    users,
    setUsers,
    products: allProducts,
    setProducts,
    fetchOrders,
    fetchUsers,
    fetchProducts,
  } = useOrderData({ setOrders, setLoading });
  const productGridRef = useRef<any>(null);
  
  // Filtreler
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  
  // Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string>('');

  // Data fetching
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
      const orderDateOnly = new Date(orderDate.getFullYear(), orderDate.getMonth(), orderDate.getDate());
      
      if (startDate) {
        const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
        if (orderDateOnly < startDateOnly) return false;
      }
      
      if (endDate) {
        const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
        if (orderDateOnly > endDateOnly) return false;
      }
    }
    
    return true;
  });

  // Seçili sipariş değiştiğinde ürünleri yükle
  useEffect(() => {
    if (selectedOrderId) {
      const order = orders.find((o) => o.id === selectedOrderId);
      if (order) {
        const productsWithDetails = (order.products || []).map((op, index) => {
          let productWithDetails = { ...op };
          if (!productWithDetails.product) {
            const product = allProducts.find((p) => p.id === op.productId);
            if (product) {
              productWithDetails.product = product;
            }
          }
          if (!productWithDetails._uniqueKey) {
            productWithDetails._uniqueKey = `${selectedOrderId}-${op.productId}-${index}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          }
          return productWithDetails;
        });
        setSelectedOrderProducts(productsWithDetails);
      } else {
        setSelectedOrderProducts([]);
      }
    } else {
      setSelectedOrderProducts([]);
    }
  }, [selectedOrderId, orders, allProducts, setSelectedOrderProducts]);

  const handleOrderSelectionChanged = (e: any) => {
    const selectedRowKeys = e.selectedRowKeys;
    if (selectedRowKeys && selectedRowKeys.length > 0) {
      setSelectedOrderId(selectedRowKeys[0] as number);
    } else {
      setSelectedOrderId(null);
    }
  };

  // Order handlers
  const {
    handleOrderRowInserted,
    handleOrderRowUpdated,
    handleOrderRowRemoved,
  } = useOrderHandlers({
    orders,
    setOrders,
    selectedOrderId,
    setSelectedOrderId,
    getMaxOrderId,
    productGridRef,
  });

  // Product handlers
  const {
    handleProductRowInserted,
    handleProductRowUpdated,
    handleProductRowRemoved,
    handleImageUpload,
  } = useProductHandlers({
    selectedOrderId,
    orders,
    setOrders,
    products: allProducts,
    selectedOrderProducts,
    setSelectedOrderProducts,
    getMaxProductId,
  });

  const handleShowImage = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setModalVisible(true);
  };

  const handleClearFilters = () => {
    setStartDate(null);
    setEndDate(null);
    setSelectedUserId(null);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 page-enter">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full border-4 border-gray-200 border-t-blue-600 loading-spinner"></div>
          <p className="text-gray-600 text-lg font-medium loading-text">Siparişler yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8 page-enter">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between rounded-lg bg-white p-6 shadow card-hover">
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
          <OrderGrid
            orders={filteredOrders}
            selectedOrderId={selectedOrderId}
            onSelectionChanged={handleOrderSelectionChanged}
            onRowInserted={handleOrderRowInserted}
            onRowUpdated={handleOrderRowUpdated}
            onRowRemoved={handleOrderRowRemoved}
            onRowClick={(e: any) => {
              if (e.data && e.data.id) {
                setSelectedOrderId(e.data.id);
              }
            }}
          />

          {/* Ürün Grid */}
          <ProductGrid
            selectedOrderId={selectedOrderId}
            products={selectedOrderProducts}
            orders={orders}
            allProducts={allProducts}
            onRowInserted={handleProductRowInserted}
            onRowUpdated={handleProductRowUpdated}
            onRowRemoved={handleProductRowRemoved}
            onShowImage={handleShowImage}
            onImageUpload={handleImageUpload}
          />
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
