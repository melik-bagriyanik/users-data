import { useState, useCallback } from 'react';
import type { User } from '../types';

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

export function useUserData() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      let apiUsers: User[] = [];
      try {
        const response = await fetch('https://fakestoreapi.com/users', {
          signal: controller.signal,
        });
        
        if (response.ok) {
          apiUsers = await response.json();
        } else {
          apiUsers = getMockUsers();
        }
      } catch (fetchError: any) {
        if (fetchError.name === 'AbortError') {
          console.warn('API çağrısı zaman aşımına uğradı, mock veri kullanılıyor');
        } else {
          console.error('API çağrısı hatası:', fetchError);
        }
        apiUsers = getMockUsers();
      } finally {
        clearTimeout(timeoutId);
      }
      
      try {
        const newUsersStr = localStorage.getItem('newUsers');
        const deletedUsersStr = localStorage.getItem('deletedUsers');
        
        let deletedUserIds: number[] = [];
        if (deletedUsersStr) {
          try {
            deletedUserIds = JSON.parse(deletedUsersStr);
            if (!Array.isArray(deletedUserIds)) {
              deletedUserIds = [];
            }
          } catch (e) {
            console.error('Silinen kullanıcılar parse hatası:', e);
            deletedUserIds = [];
          }
        }
        
        const filteredApiUsers = apiUsers.filter((user) => !deletedUserIds.includes(user.id));
        
        if (newUsersStr) {
          const newUsers: User[] = JSON.parse(newUsersStr);
          const filteredNewUsers = newUsers.filter((user) => !deletedUserIds.includes(user.id));
          const allUsers = [...filteredApiUsers, ...filteredNewUsers];
          allUsers.sort((a, b) => (b.id || 0) - (a.id || 0));
          setUsers(allUsers);
        } else {
          setUsers(filteredApiUsers);
        }
      } catch (storageError) {
        setUsers(apiUsers);
      }
    } catch (error) {
      console.error('Kullanıcılar yüklenirken hata:', error);
      setUsers(getMockUsers());
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    users,
    setUsers,
    loading,
    setLoading,
    fetchUsers,
  };
}

