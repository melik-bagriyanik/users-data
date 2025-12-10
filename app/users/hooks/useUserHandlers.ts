import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '../types';

interface UseUserHandlersProps {
  users: User[];
  setUsers: (users: User[]) => void;
  selectedRowKeys: number[];
  setSelectedRowKeys: (keys: number[]) => void;
}

export function useUserHandlers({
  users,
  setUsers,
  selectedRowKeys,
  setSelectedRowKeys,
}: UseUserHandlersProps) {
  const router = useRouter();

  const handleDelete = useCallback(async (e: any) => {
    const userId = e.data.id;
    
    try {
      try {
        const newUsersStr = localStorage.getItem('newUsers');
        if (newUsersStr) {
          const newUsers: User[] = JSON.parse(newUsersStr);
          const filteredUsers = newUsers.filter((user) => user.id !== userId);
          localStorage.setItem('newUsers', JSON.stringify(filteredUsers));
        }
      } catch (storageError) {
        console.error('LocalStorage silme hatası:', storageError);
      }

      try {
        const deletedUsersStr = localStorage.getItem('deletedUsers');
        let deletedUserIds: number[] = [];
        if (deletedUsersStr) {
          try {
            deletedUserIds = JSON.parse(deletedUsersStr);
            if (!Array.isArray(deletedUserIds)) {
              deletedUserIds = [];
            }
          } catch (e) {
            deletedUserIds = [];
          }
        }
        
        if (!deletedUserIds.includes(userId)) {
          deletedUserIds.push(userId);
          localStorage.setItem('deletedUsers', JSON.stringify(deletedUserIds));
        }
      } catch (storageError) {
        console.error('Silinen kullanıcılar kaydetme hatası:', storageError);
      }

      await fetch(`https://fakestoreapi.com/users/${userId}`, {
        method: 'DELETE',
      });

      setUsers(users.filter((user) => user.id !== userId));
    } catch (error) {
      console.error('Silme işlemi sırasında hata:', error);
      setUsers(users.filter((user) => user.id !== userId));
    }
  }, [users, setUsers]);

  const handleEdit = useCallback((e: any) => {
    const rowData = e.row?.data || e.data;
    if (rowData && rowData.id) {
      router.push(`/users/edit/${rowData.id}`);
    }
  }, [router]);

  const handleSelectedDelete = useCallback(() => {
    if (selectedRowKeys.length === 0) return;

    if (confirm(`${selectedRowKeys.length} kullanıcı silinecek. Emin misiniz?`)) {
      try {
        const newUsersStr = localStorage.getItem('newUsers');
        if (newUsersStr) {
          const newUsers: User[] = JSON.parse(newUsersStr);
          const filteredUsers = newUsers.filter((user) => !selectedRowKeys.includes(user.id));
          localStorage.setItem('newUsers', JSON.stringify(filteredUsers));
        }
      } catch (storageError) {
        console.error('LocalStorage silme hatası:', storageError);
      }

      try {
        const deletedUsersStr = localStorage.getItem('deletedUsers');
        let deletedUserIds: number[] = [];
        if (deletedUsersStr) {
          try {
            deletedUserIds = JSON.parse(deletedUsersStr);
            if (!Array.isArray(deletedUserIds)) {
              deletedUserIds = [];
            }
          } catch (e) {
            deletedUserIds = [];
          }
        }
        
        selectedRowKeys.forEach((userId) => {
          if (!deletedUserIds.includes(userId)) {
            deletedUserIds.push(userId);
          }
        });
        
        localStorage.setItem('deletedUsers', JSON.stringify(deletedUserIds));
      } catch (storageError) {
        console.error('Silinen kullanıcılar kaydetme hatası:', storageError);
      }

      setUsers(users.filter((user) => !selectedRowKeys.includes(user.id)));
      setSelectedRowKeys([]);
    }
  }, [selectedRowKeys, users, setUsers, setSelectedRowKeys]);

  return {
    handleDelete,
    handleEdit,
    handleSelectedDelete,
  };
}

