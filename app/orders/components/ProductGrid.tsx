'use client';

import { useRef } from 'react';
import DataGrid, {
  Column,
  Editing,
  Paging,
  Toolbar,
  Item as GridItem,
  Scrolling,
} from 'devextreme-react/data-grid';
import Button from 'devextreme-react/button';
import type { Order, OrderProduct, Product } from '../types';

interface ProductGridProps {
  selectedOrderId: number | null;
  products: OrderProduct[];
  orders: Order[];
  allProducts: Product[];
  onRowInserted: (e: any) => void;
  onRowUpdated: (e: any) => void;
  onRowRemoved: (e: any) => void;
  onShowImage: (imageUrl: string) => void;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>, rowData: OrderProduct) => void;
}

export default function ProductGrid({
  selectedOrderId,
  products,
  orders,
  allProducts,
  onRowInserted,
  onRowUpdated,
  onRowRemoved,
  onShowImage,
  onImageUpload,
}: ProductGridProps) {
  const productGridRef = useRef<any>(null);

  if (!selectedOrderId) {
    return (
      <div className="rounded-lg bg-white p-6 shadow">
        <div className="flex h-[600px] items-center justify-center">
          <div className="text-center">
            <p className="text-lg text-gray-500">
              Ürünleri görmek için bir sipariş seçin
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow">
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
        dataSource={products}
        keyExpr="_uniqueKey"
        showBorders={true}
        height="600px"
        onRowInserted={onRowInserted}
        onRowUpdated={onRowUpdated}
        onRowRemoved={onRowRemoved}
        onRowRemoving={(e: any) => {
          const confirmed = window.confirm('Bu ürünü silmek istediğinizden emin misiniz?');
          if (!confirmed) {
            e.cancel = true;
          }
        }}
        onSaving={async (e: any) => {
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
                    onClick={() => onShowImage(imageUrl)}
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
                  onChange={(e) => onImageUpload(e, rowData)}
                />
                <Button
                  text="Fotoğraf Ekle"
                  stylingMode="outlined"
                  icon="image"
                  width={100}
                  onClick={(e: any) => {
                    e.event?.stopPropagation();
                    e.event?.preventDefault();
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
    </div>
  );
}

