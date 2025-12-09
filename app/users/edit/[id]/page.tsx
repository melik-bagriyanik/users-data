'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Form, { Item, Label, ButtonItem, GroupItem } from 'devextreme-react/form';
import Button from 'devextreme-react/button';
import { getAuthCookie } from '@/lib/cookies';
import type { User } from '../page';

export default function EditUserPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params?.id as string;
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    const authData = getAuthCookie();
    if (!authData) {
      router.push('/login');
      return;
    }
    if (userId) {
      fetchUser();
    }
  }, [userId, router]);

  const fetchUser = async () => {
    try {
      setLoading(true);
      const response = await fetch(`https://fakestoreapi.com/users/${userId}`);
      if (response.ok) {
        const data = await response.json();
        setUser(data);
        setFormData(data);
      } else {
        // API başarısız olursa örnek veri kullan
        const mockUser = getMockUser(parseInt(userId));
        setUser(mockUser);
        setFormData(mockUser);
      }
    } catch (error) {
      console.error('Kullanıcı yüklenirken hata:', error);
      const mockUser = getMockUser(parseInt(userId));
      setUser(mockUser);
      setFormData(mockUser);
    } finally {
      setLoading(false);
    }
  };

  const getMockUser = (id: number): User => {
    return {
      id,
      email: 'example@gmail.com',
      username: 'example_user',
      name: { firstname: 'Example', lastname: 'User' },
      address: {
        city: 'Istanbul',
        street: 'Example Street',
        number: 1,
        zipcode: '34000',
        geolocation: { lat: '41.0082', long: '28.9784' },
      },
      phone: '555-0000',
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch(`https://fakestoreapi.com/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok || response.status === 200) {
        alert('Kullanıcı başarıyla güncellendi!');
        router.push('/users');
      } else {
        alert('Kullanıcı güncellendi (mock)');
        router.push('/users');
      }
    } catch (error) {
      console.error('Güncelleme sırasında hata:', error);
      alert('Kullanıcı güncellendi (mock)');
      router.push('/users');
    }
  };

  const handleCancel = () => {
    router.push('/users');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Yükleniyor...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Kullanıcı bulunamadı</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between rounded-lg bg-white p-6 shadow">
          <h1 className="text-2xl font-bold text-gray-800">
            Kullanıcı Düzenle
          </h1>
          <Button
            text="Geri Dön"
            stylingMode="outlined"
            onClick={handleCancel}
          />
        </div>

        {/* Form */}
        <div className="rounded-lg bg-white p-6 shadow">
          <form onSubmit={handleSubmit}>
            <Form
              formData={formData}
              onFieldDataChanged={(e) => {
                if (e.dataField) {
                  const newFormData = { ...formData };
                  if (e.dataField.startsWith('name.')) {
                    const field = e.dataField.split('.')[1];
                    if (!newFormData.name) newFormData.name = {};
                    newFormData.name[field] = e.value;
                  } else if (e.dataField.startsWith('address.')) {
                    const field = e.dataField.split('.')[1];
                    if (!newFormData.address) newFormData.address = {};
                    newFormData.address[field] = e.value;
                  } else {
                    newFormData[e.dataField] = e.value;
                  }
                  setFormData(newFormData);
                }
              }}
            >
              <GroupItem caption="Temel Bilgiler">
                <Item
                  dataField="id"
                  editorType="dxNumberBox"
                  editorOptions={{ disabled: true }}
                >
                  <Label text="ID" />
                </Item>
                <Item dataField="username" editorType="dxTextBox" isRequired={true}>
                  <Label text="Kullanıcı Adı" />
                </Item>
                <Item
                  dataField="email"
                  editorType="dxTextBox"
                  editorOptions={{ mode: 'email' }}
                  isRequired={true}
                >
                  <Label text="E-posta" />
                </Item>
                <Item dataField="phone" editorType="dxTextBox">
                  <Label text="Telefon" />
                </Item>
              </GroupItem>

              <GroupItem caption="Ad Soyad">
                <Item
                  dataField="name.firstname"
                  editorType="dxTextBox"
                  isRequired={true}
                >
                  <Label text="Ad" />
                </Item>
                <Item
                  dataField="name.lastname"
                  editorType="dxTextBox"
                  isRequired={true}
                >
                  <Label text="Soyad" />
                </Item>
              </GroupItem>

              <GroupItem caption="Adres Bilgileri">
                <Item dataField="address.city" editorType="dxTextBox">
                  <Label text="Şehir" />
                </Item>
                <Item dataField="address.street" editorType="dxTextBox">
                  <Label text="Sokak" />
                </Item>
                <Item
                  dataField="address.number"
                  editorType="dxNumberBox"
                  editorOptions={{ min: 1 }}
                >
                  <Label text="Numara" />
                </Item>
                <Item dataField="address.zipcode" editorType="dxTextBox">
                  <Label text="Posta Kodu" />
                </Item>
              </GroupItem>

              <ButtonItem
                horizontalAlignment="left"
                colCount={2}
                buttonOptions={[
                  {
                    text: 'İptal',
                    stylingMode: 'outlined',
                    type: 'normal',
                    onClick: handleCancel,
                  },
                  {
                    text: 'Kaydet',
                    type: 'default',
                    useSubmitBehavior: true,
                    stylingMode: 'contained',
                  },
                ]}
              />
            </Form>
          </form>
        </div>
      </div>
    </div>
  );
}

