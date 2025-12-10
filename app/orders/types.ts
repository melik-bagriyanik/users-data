export interface Order {
  id: number;
  userId: number;
  date: string;
  products: OrderProduct[];
  orderType?: string; // Sipariş türü
  __v?: number;
}

export interface OrderProduct {
  productId: number;
  quantity: number;
  product?: Product;
  _uniqueKey?: string; // Unique key for DataGrid
  title?: string; // Ürün adı override için
  price?: number; // Fiyat override için
  image?: string; // Ürün fotoğrafı (base64 veya URL)
}

export interface Product {
  id: number;
  title: string;
  price: number;
  description: string;
  category: string;
  image: string;
  rating?: {
    rate: number;
    count: number;
  };
}

