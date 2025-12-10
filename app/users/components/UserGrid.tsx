'use client';

import DataGrid, {
  Column,
  Editing,
  Paging,
  Selection,
  Toolbar,
  Item,
} from 'devextreme-react/data-grid';
import type { User } from '../types';

interface UserGridProps {
  users: User[];
  selectedRowKeys: number[];
  onSelectionChanged: (keys: number[]) => void;
  onRowRemoving: (e: any) => void;
  onEdit: (e: any) => void;
}

export default function UserGrid({
  users,
  selectedRowKeys,
  onSelectionChanged,
  onRowRemoving,
  onEdit,
}: UserGridProps) {
  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <DataGrid
        dataSource={users}
        keyExpr="id"
        showBorders={true}
        onRowRemoving={onRowRemoving}
        selectedRowKeys={selectedRowKeys}
        onSelectionChanged={(e) => onSelectionChanged(e.selectedRowKeys as number[])}
        height="600px"
        allowColumnReordering={true}
        allowColumnResizing={true}
        columnAutoWidth={true}
      >
        <Selection mode="multiple" showCheckBoxesMode="always" />
        <Paging enabled={true} pageSize={10} />
        <Editing
          mode="row"
          allowDeleting={true}
          useIcons={true}
        />
        <Toolbar>
          <Item name="addRowButton" />
          <Item name="saveButton" options={{ icon: 'save' }} />
          <Item name="cancelButton" options={{ icon: 'close' }} />
        </Toolbar>

        <Column
          dataField="id"
          caption="ID"
          width={80}
          allowEditing={false}
        />
        <Column
          dataField="username"
          caption="Kullanıcı Adı"
          width={150}
        />
        <Column
          dataField="email"
          caption="E-posta"
          width={200}
        />
        <Column
          dataField="name.firstname"
          caption="Ad"
          width={120}
        />
        <Column
          dataField="name.lastname"
          caption="Soyad"
          width={120}
        />
        <Column
          dataField="phone"
          caption="Telefon"
          width={150}
        />
        <Column
          dataField="address.city"
          caption="Şehir"
          width={120}
        />
        <Column
          type="buttons"
          width={100}
          buttons={[
            {
              hint: 'Düzenle',
              icon: 'edit',
              onClick: (e: any) => {
                e.event?.stopPropagation();
                onEdit(e);
              },
            },
            'delete',
          ]}
        />
      </DataGrid>
    </div>
  );
}

