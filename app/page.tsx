'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAuthCookie, removeAuthCookie } from '@/lib/cookies';
import Button from 'devextreme-react/button';

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<{ username: string; email?: string } | null>(null);

  useEffect(() => {
    const authData = getAuthCookie();
    if (authData) {
      setUser(authData);
    } else {
      router.push('/login');
    }
  }, [router]);

  const handleLogout = () => {
    removeAuthCookie();
    router.push('/login');
    router.refresh();
  };

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between rounded-lg bg-white p-6 shadow">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Hoş Geldiniz, {user.username}!
            </h1>
            {user.email && (
              <p className="mt-1 text-sm text-gray-600">{user.email}</p>
            )}
          </div>
          <Button
            text="Çıkış Yap"
            type="danger"
            stylingMode="contained"
            onClick={handleLogout}
          />
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-semibold text-gray-800">
            Ana Sayfa
          </h2>
          <p className="mb-4 text-gray-600">
            Sistem özelliklerine aşağıdaki butonlardan erişebilirsiniz.
          </p>
          <div className="flex gap-3">
            <Button
              text="Kullanıcı Listesi"
              type="default"
              stylingMode="contained"
              onClick={() => router.push('/users')}
            />
            <Button
              text="Siparişler"
              type="default"
              stylingMode="contained"
              onClick={() => router.push('/orders')}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
