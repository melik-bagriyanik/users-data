'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from 'devextreme-react/button';
import { getAuthCookie } from '@/lib/cookies';
import UserHeader from './components/UserHeader';
import UserGrid from './components/UserGrid';
import { useUserData } from './hooks/useUserData';
import { useUserHandlers } from './hooks/useUserHandlers';

export default function UsersPage() {
  const router = useRouter();
  const { users, setUsers, loading, setLoading, fetchUsers } = useUserData();
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([]);

  const {
    handleDelete,
    handleEdit,
    handleSelectedDelete,
  } = useUserHandlers({
    users,
    setUsers,
    selectedRowKeys,
    setSelectedRowKeys,
  });

  useEffect(() => {
    const authData = getAuthCookie();
    if (!authData) {
      router.push('/login');
      return;
    }
    fetchUsers();
    
    const handleFocus = () => {
      fetchUsers();
    };
    
    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [router, fetchUsers]);

  const user = getAuthCookie();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 page-enter">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full border-4 border-gray-200 border-t-blue-600 loading-spinner"></div>
          <p className="text-gray-600 text-lg font-medium loading-text">Kullanıcılar yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8 page-enter">
      <div className="mx-auto max-w-7xl">
        <UserHeader
          username={user?.username}
          selectedRowKeys={selectedRowKeys}
          onSelectedDelete={handleSelectedDelete}
          onCancelSelection={() => setSelectedRowKeys([])}
        />

        <div className="mb-4 flex items-center justify-between">
          {selectedRowKeys.length > 0 && (
            <div className="flex items-center gap-3">
              <Button
                text={`Seçili ${selectedRowKeys.length} Kaydı Sil`}
                type="danger"
                stylingMode="contained"
                onClick={handleSelectedDelete}
              />
              <Button
                text="Vazgeç"
                stylingMode="outlined"
                onClick={() => setSelectedRowKeys([])}
              />
            </div>
          )}
        </div>

        <UserGrid
          users={users}
          selectedRowKeys={selectedRowKeys}
          onSelectionChanged={setSelectedRowKeys}
          onRowRemoving={handleDelete}
          onEdit={handleEdit}
        />
      </div>
    </div>
  );
}
