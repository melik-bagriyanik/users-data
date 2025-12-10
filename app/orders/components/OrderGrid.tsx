'use client';

import DataGrid, {
  Column,
  Editing,
  Paging,
  Selection,
  Toolbar,
  Item as GridItem,
  Scrolling,
} from 'devextreme-react/data-grid';
import type { Order } from '../types';

interface OrderGridProps {
  orders: Order[];
  selectedOrderId: number | null;
  onSelectionChanged: (e: any) => void;
  onRowInserted: (e: any) => void;
  onRowUpdated: (e: any) => void;
  onRowRemoved: (e: any) => void;
  onRowClick: (e: any) => void;
}

export default function OrderGrid({
  orders,
  selectedOrderId,
  onSelectionChanged,
  onRowInserted,
  onRowUpdated,
  onRowRemoved,
  onRowClick,
}: OrderGridProps) {
  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <h2 className="mb-4 text-xl font-semibold text-gray-800">Sipariş Listesi</h2>
      <DataGrid
        dataSource={orders}
        keyExpr="id"
        showBorders={true}
        height="600px"
        onSelectionChanged={onSelectionChanged}
        selectedRowKeys={selectedOrderId ? [selectedOrderId] : []}
        onRowInserted={onRowInserted}
        onRowUpdated={onRowUpdated}
        onRowRemoved={onRowRemoved}
        onRowRemoving={(e: any) => {
          const confirmed = window.confirm('Bu siparişi silmek istediğinizden emin misiniz?');
          if (!confirmed) {
            e.cancel = true;
          }
        }}
        onRowClick={onRowClick}
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
          <GridItem 
            name="addRowButton" 
            options={{ 
              text: 'Yeni Sipariş Ekle',
              hint: 'Yeni Sipariş Ekle',
              stylingMode: 'contained'
            }} 
          />
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
          editorOptions={{
            editorType: 'dxNumberBox',
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
          calculateCellValue={(rowData: Order) => {
            return rowData.orderType || '';
          }}
          setCellValue={(rowData: Order, value: any) => {
            rowData.orderType = value || '';
          }}
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
  );
}

