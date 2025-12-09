'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DataGrid, {
  Column,
  Editing,
  Paging,
  Selection,
  Toolbar,
  Item,
} from 'devextreme-react/data-grid';
import Button from 'devextreme-react/button';
import { getAuthCookie, removeAuthCookie } from '@/lib/cookies';

export interface User {
  id: number;
  email: string;
  username: string;
  password?: string;
  name: {
    firstname: string;
    lastname: string;
  };
  address?: {
    city: string;
    street: string;
    number: number;
    zipcode: string;
    geolocation: {
      lat: string;
      long: string;
    };
  };
  phone?: string;
}

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([]);

  useEffect(() => {
    const authData = getAuthCookie();
    if (!authData) {
      router.push('/login');
      return;
    }
    fetchUsers();
  }, [router]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      // FakeStoreAPI'den kullanıcıları çek
      const response = await fetch('https://fakestoreapi.com/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      } else {
        // API başarısız olursa örnek veri kullan
        setUsers(getMockUsers());
      }
    } catch (error) {
      console.error('Kullanıcılar yüklenirken hata:', error);
      // Hata durumunda örnek veri kullan
      setUsers(getMockUsers());
    } finally {
      setLoading(false);
    }
  };

  const getMockUsers = (): User[] => {
    return [
      {
        id: 1,
        email: 'john@gmail.com',
        username: 'johnd',
        password: 'm38rmF$',
        name: { firstname: 'John', lastname: 'Doe' },
        address: {
          city: 'kilcoole',
          street: '7835 new road',
          number: 3,
          zipcode: '12926-3874',
          geolocation: { lat: '-37.3159', long: '81.1496' },
        },
        phone: '1-570-236-7033',
      },
      {
        id: 2,
        email: 'morrison@gmail.com',
        username: 'mor_2314',
        password: '83r5^_',
        name: { firstname: 'David', lastname: 'Morrison' },
        address: {
          city: 'Cullman',
          street: '5292 new road',
          number: 3,
          zipcode: '29576-1332',
          geolocation: { lat: '-50.1500', long: '-50.2340' },
        },
        phone: '1-570-236-7033',
      },
      {
        id: 3,
        email: 'kevin@gmail.com',
        username: 'kevinryan',
        password: 'kev02937@',
        name: { firstname: 'Kevin', lastname: 'Ryan' },
        address: {
          city: 'San Antonio',
          street: '3329 new road',
          number: 3,
          zipcode: '54243-1332',
          geolocation: { lat: '-40.1500', long: '50.2340' },
        },
        phone: '1-567-094-1345',
      },
    ];
  };

  const handleDelete = async (e: any) => {
    const userId = e.data.id;
    
    try {
      // API'ye silme isteği gönder
      const response = await fetch(`https://fakestoreapi.com/users/${userId}`, {
        method: 'DELETE',
      });

      if (response.ok || response.status === 200) {
        // Başarılı olursa listeden kaldır
        setUsers(users.filter((user) => user.id !== userId));
      } else {
        // API başarısız olursa sadece listeden kaldır
        setUsers(users.filter((user) => user.id !== userId));
      }
    } catch (error) {
      console.error('Silme işlemi sırasında hata:', error);
      // Hata durumunda da listeden kaldır
      setUsers(users.filter((user) => user.id !== userId));
    }
  };

  const handleEdit = (e: any) => {
    const userId = e.data.id;
    router.push(`/users/edit/${userId}`);
  };

  const handleSelectedDelete = () => {
    if (selectedRowKeys.length === 0) return;

    if (confirm(`${selectedRowKeys.length} kullanıcı silinecek. Emin misiniz?`)) {
      setUsers(users.filter((user) => !selectedRowKeys.includes(user.id)));
      setSelectedRowKeys([]);
    }
  };

  const handleLogout = () => {
    removeAuthCookie();
    router.push('/login');
    router.refresh();
  };

  const user = getAuthCookie();

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
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Kullanıcı Listesi</h1>
            {user && (
              <p className="mt-1 text-sm text-gray-600">
                Hoş geldiniz, {user.username}
              </p>
            )}
          </div>
          <Button
            text="Çıkış Yap"
            type="danger"
            stylingMode="contained"
            onClick={handleLogout}
          />
        </div>

        {/* DataGrid */}
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="mb-4 flex items-center justify-between">
            {selectedRowKeys.length > 0 && (
              <Button
                text={`Seçili ${selectedRowKeys.length} Kaydı Sil`}
                type="danger"
                stylingMode="contained"
                onClick={handleSelectedDelete}
              />
            )}
          </div>

          <DataGrid
            dataSource={users}
            keyExpr="id"
            showBorders={true}
            onRowRemoving={handleDelete}
            onRowClick={handleEdit}
            selectedRowKeys={selectedRowKeys}
            onSelectionChanged={(e) => setSelectedRowKeys(e.selectedRowKeys as number[])}
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
              <Item name="saveButton" />
              <Item name="cancelButton" />
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
                    handleEdit(e);
                  },
                },
                'delete',
              ]}
            />
          </DataGrid>
        </div>
      </div>
    </div>
  );
}

