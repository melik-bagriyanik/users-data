import { useCallback } from 'react';
import type { Order, OrderProduct, Product } from '../types';

interface UseProductHandlersProps {
  selectedOrderId: number | null;
  orders: Order[];
  setOrders: (orders: Order[]) => void;
  products: Product[];
  selectedOrderProducts: OrderProduct[];
  setSelectedOrderProducts: (products: OrderProduct[]) => void;
  getMaxProductId: (orders: Order[], products: Product[]) => number;
}

export function useProductHandlers({
  selectedOrderId,
  orders,
  setOrders,
  products,
  selectedOrderProducts,
  setSelectedOrderProducts,
  getMaxProductId,
}: UseProductHandlersProps) {
  const handleProductRowInserted = useCallback(async (e: any) => {
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
            storedOrders.push(updatedOrder);
          }
          
          // Boyut kontrolü yap
          const dataString = JSON.stringify(storedOrders);
          const dataSize = new Blob([dataString]).size;
          const maxSize = 4 * 1024 * 1024; // 4MB
          
          if (dataSize > maxSize) {
            alert('Veri çok büyük! Lütfen bazı fotoğrafları kaldırın veya daha küçük fotoğraflar kullanın.');
            console.error('LocalStorage boyut limiti aşıldı:', dataSize, 'bytes');
            setOrders(orders.map((o) => (o.id === selectedOrderId ? updatedOrder : o)));
            return;
          }
          
          localStorage.setItem('newOrders', dataString);
          console.log('Ürün eklendi, localStorage güncellendi:', newProduct.productId);
        } catch (storageError: any) {
          if (storageError.name === 'QuotaExceededError') {
            alert('Depolama alanı dolu! Lütfen bazı fotoğrafları kaldırın veya daha küçük fotoğraflar kullanın.');
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
  }, [selectedOrderId, orders, setOrders, products, getMaxProductId]);

  const handleProductRowUpdated = useCallback(async (e: any) => {
    if (!selectedOrderId) return;
    
    try {
      const updatedProduct = e.data || e.newData || e.row?.data;
      const uniqueKey = e.key || updatedProduct?._uniqueKey;
      
      if (!uniqueKey) {
        console.error('Güncellenecek ürün key bulunamadı:', e);
        return;
      }
      
      const order = orders.find((o) => o.id === selectedOrderId);
      if (!order) {
        console.error('Sipariş bulunamadı:', selectedOrderId);
        return;
      }
      
      const currentProduct = (order.products || []).find(
        (p) => p._uniqueKey === uniqueKey
      );
      
      if (!currentProduct) {
        console.error('Güncellenecek ürün siparişte bulunamadı:', uniqueKey);
        return;
      }
      
      // ProductId değiştiyse kontrol et
      if (updatedProduct.productId && 
          currentProduct.productId !== updatedProduct.productId) {
        const existingProduct = (order.products || []).find(
          (p) => p.productId === updatedProduct.productId && p._uniqueKey !== uniqueKey
        );
        if (existingProduct) {
          alert(`Bu siparişte zaten productId ${updatedProduct.productId} bulunuyor!`);
          return;
        }
      }
      
      const newProductData = updatedProduct || e.data || e.newData || {};
      
      let productWithDetails = {
        ...currentProduct,
        ...newProductData,
        _uniqueKey: uniqueKey,
      };
      
      // ProductId varsa ve değiştiyse, yeni product bilgisini yükle
      if (productWithDetails.productId && products.length > 0) {
        const product = products.find((p) => p.id === productWithDetails.productId);
        if (product) {
          productWithDetails.product = product;
          if (!productWithDetails.title) {
            productWithDetails.title = product.title;
          }
          if (productWithDetails.price === undefined) {
            productWithDetails.price = product.price;
          }
        } else {
          productWithDetails.product = currentProduct.product;
        }
      } else if (currentProduct.product) {
        productWithDetails.product = currentProduct.product;
        if (!productWithDetails.title) {
          productWithDetails.title = currentProduct.title || currentProduct.product.title;
        }
        if (productWithDetails.price === undefined) {
          productWithDetails.price = currentProduct.price !== undefined ? currentProduct.price : currentProduct.product.price;
        }
      }
      
      if (productWithDetails.quantity !== undefined) {
        productWithDetails.quantity = Number(productWithDetails.quantity) || 1;
      }
      
      if (productWithDetails.productId !== undefined) {
        productWithDetails.productId = Number(productWithDetails.productId) || 0;
      }
      
      const updatedProducts = (order.products || []).map((p) =>
        p._uniqueKey === uniqueKey ? productWithDetails : p
      );
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
        
        localStorage.setItem('newOrders', JSON.stringify(storedOrders));
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
  }, [selectedOrderId, orders, setOrders, products, selectedOrderProducts, setSelectedOrderProducts]);

  const handleProductRowRemoved = useCallback(async (e: any) => {
    if (!selectedOrderId) return;
    
    try {
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
      
      let updatedProducts = (order.products || []).filter(
        (p) => p._uniqueKey !== uniqueKey
      );
      
      if (updatedProducts.length === (order.products || []).length && removedProduct?.productId) {
        updatedProducts = (order.products || []).filter(
          (p) => p.productId !== removedProduct.productId
        );
      }
      
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
        
        localStorage.setItem('newOrders', JSON.stringify(storedOrders));
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
  }, [selectedOrderId, orders, setOrders, products, setSelectedOrderProducts]);

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>, rowData: OrderProduct) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Lütfen bir resim dosyası seçin!');
      return;
    }

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

      const base64Image = await compressImage(file);
      
      const order = orders.find((o) => o.id === selectedOrderId);
      if (!order) {
        console.error('Sipariş bulunamadı:', selectedOrderId);
        return;
      }

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
      
      if (productIndex === -1 && rowData.productId) {
        const productsWithoutKey = (order.products || []).filter(
          (p) => !p._uniqueKey && p.productId === rowData.productId
        );
        if (productsWithoutKey.length > 0) {
          const lastProduct = productsWithoutKey[productsWithoutKey.length - 1];
          productIndex = (order.products || []).lastIndexOf(lastProduct);
          if (productIndex >= 0) {
            productToUpdate = order.products[productIndex];
          }
        } else {
          const productsWithSameId = (order.products || []).filter(
            (p) => p.productId === rowData.productId
          );
          if (productsWithSameId.length > 0) {
            const lastIndex = (order.products || []).lastIndexOf(productsWithSameId[productsWithSameId.length - 1]);
            if (lastIndex >= 0) {
              productIndex = lastIndex;
              productToUpdate = order.products[lastIndex];
            }
          }
        }
      }
      
      if (productIndex === -1 || !productToUpdate) {
        let targetProduct: OrderProduct | null = null;
        
        if (!rowData || Object.keys(rowData).length === 0 || !rowData.productId) {
          const productsWithoutKey = selectedOrderProducts.filter((p) => !p._uniqueKey || !order.products.find((op) => op._uniqueKey === p._uniqueKey));
          if (productsWithoutKey.length > 0) {
            targetProduct = productsWithoutKey[productsWithoutKey.length - 1];
          } else if (selectedOrderProducts.length > 0) {
            targetProduct = selectedOrderProducts[selectedOrderProducts.length - 1];
          }
        } else if (rowData.productId) {
          targetProduct = rowData;
        }
        
        if (targetProduct && targetProduct.productId) {
          const existingIndex = (order.products || []).findIndex(
            (p) => p.productId === targetProduct!.productId && (!p._uniqueKey || p._uniqueKey === targetProduct!._uniqueKey)
          );
          
          if (existingIndex >= 0) {
            productIndex = existingIndex;
            productToUpdate = order.products[existingIndex];
          } else {
            const newProduct: OrderProduct = {
              ...targetProduct,
              image: base64Image,
              product: {
                ...(targetProduct.product || {} as Product),
                image: base64Image,
              } as Product,
            };
            
            if (!newProduct._uniqueKey) {
              const productCount = (order.products || []).length;
              newProduct._uniqueKey = `${selectedOrderId}-${newProduct.productId}-${productCount}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            }
            
            const updatedProducts = [...(order.products || []), newProduct];
            const updatedOrder = { ...order, products: updatedProducts };
            
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
              
              const dataString = JSON.stringify(storedOrders);
              const dataSize = new Blob([dataString]).size;
              const maxSize = 4 * 1024 * 1024;
              
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
            
            const updatedOrders = orders.map((o) => (o.id === selectedOrderId ? updatedOrder : o));
            setOrders(updatedOrders);
            
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
        
        const dataString = JSON.stringify(storedOrders);
        const dataSize = new Blob([dataString]).size;
        const maxSize = 4 * 1024 * 1024;
        
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
      
      const updatedOrders = orders.map((o) => (o.id === selectedOrderId ? updatedOrder : o));
      setOrders(updatedOrders);
      
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
  }, [selectedOrderId, orders, setOrders, products, selectedOrderProducts, setSelectedOrderProducts]);

  return {
    handleProductRowInserted,
    handleProductRowUpdated,
    handleProductRowRemoved,
    handleImageUpload,
  };
}

