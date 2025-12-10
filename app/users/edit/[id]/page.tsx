'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Form, { Item, Label, ButtonItem, GroupItem } from 'devextreme-react/form';
import Button from 'devextreme-react/button';
import { getAuthCookie } from '@/lib/cookies';
import type { User } from '../../types';

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

export default function EditUserPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params?.id as string;
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<any>(null);

  useEffect(() => {
    const authData = getAuthCookie();
    if (!authData) {
      router.push('/login');
      return;
    }
    
    if (!userId) return;

    const fetchUser = async () => {
      try {
        setLoading(true);
        
        // Önce localStorage'dan kontrol et
        try {
          const newUsersStr = localStorage.getItem('newUsers');
          if (newUsersStr) {
            const newUsers: User[] = JSON.parse(newUsersStr);
            const foundUser = newUsers.find((u) => u.id === parseInt(userId));
            if (foundUser) {
              setUser(foundUser);
              setFormData(foundUser);
              setLoading(false);
              return;
            }
          }
        } catch (storageError) {
          console.error('LocalStorage okuma hatası:', storageError);
        }
        
        // API'den çek (timeout ile)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 saniye timeout
        
        try {
          const response = await fetch(`https://fakestoreapi.com/users/${userId}`, {
            signal: controller.signal,
          });
          
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
        } catch (fetchError: any) {
          if (fetchError.name === 'AbortError') {
            console.warn('API çağrısı zaman aşımına uğradı, mock veri kullanılıyor');
          } else {
            console.error('API çağrısı hatası:', fetchError);
          }
          // Hata durumunda örnek veri kullan
          const mockUser = getMockUser(parseInt(userId));
          setUser(mockUser);
          setFormData(mockUser);
        } finally {
          clearTimeout(timeoutId);
        }
      } catch (error) {
        console.error('Kullanıcı yüklenirken hata:', error);
        // Hata durumunda örnek veri kullan
        const mockUser = getMockUser(parseInt(userId));
        setUser(mockUser);
        setFormData(mockUser);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [userId, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData) {
      alert('Form verisi yüklenmedi');
      return;
    }

    try {
      // API'ye güncelleme isteği gönder (mock)
      const response = await fetch(`https://fakestoreapi.com/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      // LocalStorage'a kaydet (hem yeni eklenen hem de API'den gelen kullanıcılar için)
      try {
        const newUsersStr = localStorage.getItem('newUsers');
        const newUsers: User[] = newUsersStr ? JSON.parse(newUsersStr) : [];
        
        // Kullanıcıyı bul ve güncelle, yoksa ekle
        const userIndex = newUsers.findIndex((u) => u.id === parseInt(userId));
        if (userIndex !== -1) {
          // Mevcut kullanıcıyı güncelle
          newUsers[userIndex] = formData as User;
        } else {
          // Yeni kullanıcı olarak ekle (API'den gelen kullanıcılar için)
          newUsers.push(formData as User);
        }
        
        localStorage.setItem('newUsers', JSON.stringify(newUsers));
      } catch (storageError) {
        console.error('LocalStorage kaydetme hatası:', storageError);
      }

      if (response.ok || response.status === 200) {
        alert('Kullanıcı başarıyla güncellendi!');
        router.push('/users');
        router.refresh();
      } else {
        alert('Kullanıcı güncellendi (mock)');
        router.push('/users');
        router.refresh();
      }
    } catch (error) {
      console.error('Güncelleme sırasında hata:', error);
      
      // Hata durumunda bile localStorage'a kaydet
      try {
        const newUsersStr = localStorage.getItem('newUsers');
        const newUsers: User[] = newUsersStr ? JSON.parse(newUsersStr) : [];
        
        const userIndex = newUsers.findIndex((u) => u.id === parseInt(userId));
        if (userIndex !== -1) {
          newUsers[userIndex] = formData as User;
        } else {
          newUsers.push(formData as User);
        }
        
        localStorage.setItem('newUsers', JSON.stringify(newUsers));
      } catch (storageError) {
        console.error('LocalStorage kaydetme hatası:', storageError);
      }
      
      alert('Kullanıcı güncellendi (mock)');
      router.push('/users');
      router.refresh();
    }
  };

  const handleCancel = () => {
    router.push('/users');
  };

  const handleFieldDataChanged = useCallback((e: any) => {
    if (!e.dataField) return;
    
    setFormData((prevFormData: Partial<User> | null) => {
      if (!prevFormData) return prevFormData;
      
      const newFormData = { ...prevFormData };
      if (e.dataField.startsWith('name.')) {
        const field = e.dataField.split('.')[1];
        if (!newFormData.name) {
          newFormData.name = { firstname: '', lastname: '' };
        }
        (newFormData.name as any)[field] = e.value;
      } else if (e.dataField.startsWith('address.')) {
        const field = e.dataField.split('.')[1];
        if (!newFormData.address) {
          newFormData.address = {
            city: '',
            street: '',
            number: 0,
            zipcode: '',
            geolocation: { lat: '', long: '' },
          };
        }
        if (field === 'geolocation.lat' || field === 'geolocation.long') {
          const geoField = field.split('.')[1];
          if (!newFormData.address.geolocation) {
            newFormData.address.geolocation = { lat: '', long: '' };
          }
          (newFormData.address.geolocation as any)[geoField] = e.value;
        } else {
          (newFormData.address as any)[field] = e.value;
        }
      } else {
        (newFormData as any)[e.dataField] = e.value;
      }
      return newFormData;
    });
  }, []);

  if (loading || !user || !formData || !formData.id) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 page-enter">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full border-4 border-gray-200 border-t-blue-600 loading-spinner"></div>
          <p className="text-gray-600 text-lg font-medium loading-text">Kullanıcı bilgileri yükleniyor...</p>
        </div>
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
              onFieldDataChanged={handleFieldDataChanged}
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
                horizontalAlignment="center"
                buttonOptions={{
                  text: 'Kaydet',
                  type: 'default',
                  useSubmitBehavior: true,
                  stylingMode: 'contained',
                }}
              />
            </Form>
          </form>
          <div className="mt-4 flex justify-center gap-3">
            <Button
              text="İptal"
              stylingMode="outlined"
              onClick={handleCancel}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

