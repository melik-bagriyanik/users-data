'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Form, { Item, Label, ButtonItem, GroupItem } from 'devextreme-react/form';
import Button from 'devextreme-react/button';
import { getAuthCookie } from '@/lib/cookies';
import type { User } from '../types';

export default function NewUserPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<User>>({
    username: '',
    email: '',
    phone: '',
    password: '',
    name: {
      firstname: '',
      lastname: '',
    },
    address: {
      city: '',
      street: '',
      number: 1,
      zipcode: '',
      geolocation: {
        lat: '',
        long: '',
      },
    },
  });

  const handleFieldDataChanged = useCallback((e: any) => {
    if (!e.dataField) return;
    
    setFormData((prevFormData) => {
      if (!prevFormData) return prevFormData;
      
      const newFormData = { ...prevFormData };
      if (e.dataField.startsWith('name.')) {
        const field = e.dataField.split('.')[1];
        if (!newFormData.name) newFormData.name = { firstname: '', lastname: '' };
        newFormData.name[field as keyof typeof newFormData.name] = e.value;
      } else if (e.dataField.startsWith('address.')) {
        const field = e.dataField.split('.')[1];
        if (!newFormData.address) {
          newFormData.address = {
            city: '',
            street: '',
            number: 1,
            zipcode: '',
            geolocation: { lat: '', long: '' },
          };
        }
        if (field === 'geolocation.lat' || field === 'geolocation.long') {
          const geoField = field.split('.')[1];
          if (!newFormData.address.geolocation) {
            newFormData.address.geolocation = { lat: '', long: '' };
          }
          newFormData.address.geolocation[geoField as 'lat' | 'long'] = e.value;
        } else {
          (newFormData.address as any)[field] = e.value;
        }
      } else {
        (newFormData as any)[e.dataField] = e.value;
      }
      return newFormData;
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!formData.username || !formData.email) {
      alert('Kullanıcı adı ve e-posta gereklidir');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('https://fakestoreapi.com/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const data = await response.json();
        // Yeni eklenen kullanıcıyı localStorage'a kaydet (geçici çözüm)
        const newUser = { ...formData, id: data.id || Date.now() };
        const existingUsers = localStorage.getItem('newUsers');
        const newUsers = existingUsers ? JSON.parse(existingUsers) : [];
        newUsers.push(newUser);
        localStorage.setItem('newUsers', JSON.stringify(newUsers));
        
        alert('Kullanıcı başarıyla eklendi!');
        router.push('/users');
        router.refresh();
      } else {
        // API başarısız olursa mock olarak ekle
        const newUser = { ...formData, id: Date.now() };
        const existingUsers = localStorage.getItem('newUsers');
        const newUsers = existingUsers ? JSON.parse(existingUsers) : [];
        newUsers.push(newUser);
        localStorage.setItem('newUsers', JSON.stringify(newUsers));
        
        alert('Kullanıcı eklendi (mock)');
        router.push('/users');
        router.refresh();
      }
    } catch (error) {
      console.error('Kullanıcı eklenirken hata:', error);
      // Hata durumunda da mock olarak ekle
      const newUser = { ...formData, id: Date.now() };
      const existingUsers = localStorage.getItem('newUsers');
      const newUsers = existingUsers ? JSON.parse(existingUsers) : [];
      newUsers.push(newUser);
      localStorage.setItem('newUsers', JSON.stringify(newUsers));
      
      alert('Kullanıcı eklendi (mock)');
      router.push('/users');
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.push('/users');
  };

  const authData = getAuthCookie();
  if (!authData) {
    router.push('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between rounded-lg bg-white p-6 shadow">
          <h1 className="text-2xl font-bold text-gray-800">
            Yeni Kullanıcı Ekle
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
                <Item
                  dataField="password"
                  editorType="dxTextBox"
                  editorOptions={{ mode: 'password' }}
                  isRequired={true}
                >
                  <Label text="Şifre" />
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
                  text: loading ? 'Kaydediliyor...' : 'Kaydet',
                  type: 'default',
                  useSubmitBehavior: true,
                  stylingMode: 'contained',
                  disabled: loading,
                }}
              />
            </Form>
          </form>
          <div className="mt-4 flex justify-center gap-3">
            <Button
              text="İptal"
              stylingMode="outlined"
              onClick={handleCancel}
              disabled={loading}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

