'use client';

import Button from 'devextreme-react/button';
import { useRouter } from 'next/navigation';
import { removeAuthCookie } from '@/lib/cookies';

interface UserHeaderProps {
  username?: string;
  selectedRowKeys: number[];
  onSelectedDelete: () => void;
  onCancelSelection: () => void;
}

export default function UserHeader({
  username,
  selectedRowKeys,
  onSelectedDelete,
  onCancelSelection,
}: UserHeaderProps) {
  const router = useRouter();

  const handleLogout = () => {
    removeAuthCookie();
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="mb-6 flex items-center justify-between rounded-lg bg-white p-6 shadow card-hover">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Kullanıcı Listesi</h1>
        {username && (
          <p className="mt-1 text-sm text-gray-600">
            Hoş geldiniz, {username}
          </p>
        )}
      </div>
      <div className="flex gap-3">
        <Button
          text="Kullanıcı Ekle"
          type="default"
          stylingMode="contained"
          onClick={() => router.push('/users/new')}
        />
        <Button
          text="Siparişler"
          type="default"
          stylingMode="outlined"
          onClick={() => router.push('/orders')}
        />
        <Button
          text="Çıkış Yap"
          type="danger"
          stylingMode="contained"
          onClick={handleLogout}
        />
      </div>
    </div>
  );
}

