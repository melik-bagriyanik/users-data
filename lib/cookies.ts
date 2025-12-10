import Cookies from 'js-cookie';

export const COOKIE_NAME = 'auth_token';

export interface AuthData {
  username: string;
  email?: string;
  token?: string;
}

export const setAuthCookie = (authData: AuthData): void => {
  Cookies.set(COOKIE_NAME, JSON.stringify(authData), {
    expires: 7, // 7 gün
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });
};

export const getAuthCookie = (): AuthData | null => {
  const cookie = Cookies.get(COOKIE_NAME);
  if (!cookie) return null;
  
  try {
    return JSON.parse(cookie) as AuthData;
  } catch {
    return null;
  }
};

export const removeAuthCookie = (): void => {
  Cookies.remove(COOKIE_NAME);
};

export const isAuthenticated = (): boolean => {
  return getAuthCookie() !== null;
};


