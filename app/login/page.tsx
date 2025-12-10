'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Form, { Item, Label, ButtonItem } from 'devextreme-react/form';
import { setAuthCookie } from '@/lib/cookies';

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Basit doğrulama - gerçek uygulamada API'ye istek atılmalı
    if (!formData.username || !formData.password) {
      setError('Kullanıcı adı ve şifre gereklidir');
      return;
    }

    // Örnek: FakeStoreAPI'den kullanıcı doğrulama
    // Bu örnekte basit bir kontrol yapıyoruz
    try {
      // Gerçek uygulamada burada API çağrısı yapılır
      // Örnek: const response = await fetch('https://fakestoreapi.com/auth/login', {...})
      
      // Şimdilik basit bir doğrulama
      if (formData.username && formData.password) {
        // Cookie'ye kullanıcı bilgilerini kaydet
        setAuthCookie({
          username: formData.username,
          email: `${formData.username}@example.com`,
          token: 'mock_token_' + Date.now(),
        });

        // Ana sayfaya yönlendir
        router.push('/');
        router.refresh();
      }
    } catch (err) {
      setError('Giriş yapılırken bir hata oluştu');
      console.error(err);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
        <h1 className="mb-6 text-center text-2xl font-bold text-gray-800">
          Giriş Yap
        </h1>
        
        {error && (
          <div className="mb-4 rounded bg-red-100 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <Form
            formData={formData}
            onFieldDataChanged={(e: any) => {
              if (e.dataField && typeof e.dataField === 'string') {
                setFormData((prev) => ({
                  ...prev,
                  [e.dataField]: e.value,
                }));
              }
            }}
          >
            <Item
              dataField="username"
              editorType="dxTextBox"
              isRequired={true}
            >
              <Label text="Kullanıcı Adı" />
            </Item>

            <Item
              dataField="password"
              editorType="dxTextBox"
              editorOptions={{
                mode: 'password',
              }}
              isRequired={true}
            >
              <Label text="Şifre" />
            </Item>

            <ButtonItem
              horizontalAlignment="center"
              buttonOptions={{
                text: 'Giriş Yap',
                type: 'default',
                useSubmitBehavior: true,
                stylingMode: 'contained',
              }}
            />
          </Form>
        </form>
      </div>
    </div>
  );
}


