import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User } from '../types';
import { INITIAL_MOCK_USER, UNLINKED_MOCK_USER, INITIAL_MOCK_ADMIN } from '../services/mockData';

interface AuthResult {
  success: boolean;
  error?: string;
  redirectTo?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  login: (emailOrId: string, password: string, asAdmin?: boolean) => Promise<AuthResult>;
  register: (name: string, email: string, password: string, phone?: string) => Promise<AuthResult>;
  logout: () => void;
  markBankAsLinked: () => void;
  switchToDemoUser: (type: 'linked' | 'unlinked' | 'admin') => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load user from localStorage on initial mount
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem('vaultpay_token');
      const storedUser = localStorage.getItem('vaultpay_user');
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } else {
        // By default, initialize with Alex Sharma so demo works immediately
        setUser(INITIAL_MOCK_USER);
        setToken('simulated_jwt_alex_sharma_token');
        localStorage.setItem('vaultpay_user', JSON.stringify(INITIAL_MOCK_USER));
        localStorage.setItem('vaultpay_token', 'simulated_jwt_alex_sharma_token');
      }
    } catch {
      setUser(INITIAL_MOCK_USER);
      setToken('simulated_jwt_alex_sharma_token');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = async (emailOrId: string, _password: string, asAdmin = false): Promise<AuthResult> => {
    setIsLoading(true);
    try {
      // Simulate network request
      await new Promise((resolve) => setTimeout(resolve, 500));

      const cleanInput = emailOrId.trim().toLowerCase();

      let targetUser: User;
      let targetRedirect = '/';

      if (asAdmin || cleanInput.includes('admin')) {
        targetUser = INITIAL_MOCK_ADMIN;
        targetRedirect = '/admin';
      } else if (cleanInput.includes('samir') || cleanInput.includes('unlinked')) {
        targetUser = UNLINKED_MOCK_USER;
        targetRedirect = '/onboarding';
      } else {
        targetUser = {
          ...INITIAL_MOCK_USER,
          email: cleanInput.includes('@vault') ? `${cleanInput.split('@')[0]}@example.com` : cleanInput,
          vaultPayId: cleanInput.includes('@')
            ? (cleanInput.endsWith('@vault') ? cleanInput : `${cleanInput.split('@')[0]}@vault`)
            : `${cleanInput}@vault`,
        };
        targetRedirect = targetUser.isBankLinked ? '/' : '/onboarding';
      }

      const mockToken = `simulated_jwt_${Date.now()}`;
      setUser(targetUser);
      setToken(mockToken);
      localStorage.setItem('vaultpay_user', JSON.stringify(targetUser));
      localStorage.setItem('vaultpay_token', mockToken);

      return { success: true, redirectTo: targetRedirect };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, _password: string, phone?: string): Promise<AuthResult> => {
    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 600));

      const cleanUsername = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
      const newUser: User = {
        id: `usr_${Date.now()}`,
        name: name.trim(),
        email: email.trim(),
        vaultPayId: `${cleanUsername}@vault`,
        phone: phone?.trim(),
        role: 'user',
        isBankLinked: false, // New users MUST link a bank account
        createdAt: new Date().toISOString(),
      };

      const mockToken = `simulated_jwt_${Date.now()}`;
      setUser(newUser);
      setToken(mockToken);
      localStorage.setItem('vaultpay_user', JSON.stringify(newUser));
      localStorage.setItem('vaultpay_token', mockToken);

      return { success: true, redirectTo: '/onboarding' };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Registration failed';
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('vaultpay_user');
    localStorage.removeItem('vaultpay_token');
  };

  const markBankAsLinked = () => {
    if (user) {
      const updatedUser = { ...user, isBankLinked: true };
      setUser(updatedUser);
      localStorage.setItem('vaultpay_user', JSON.stringify(updatedUser));
    }
  };

  const switchToDemoUser = (type: 'linked' | 'unlinked' | 'admin') => {
    let selected: User;
    if (type === 'admin') selected = INITIAL_MOCK_ADMIN;
    else if (type === 'unlinked') selected = UNLINKED_MOCK_USER;
    else selected = INITIAL_MOCK_USER;

    setUser(selected);
    const token = `simulated_jwt_${selected.id}`;
    setToken(token);
    localStorage.setItem('vaultpay_user', JSON.stringify(selected));
    localStorage.setItem('vaultpay_token', token);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(user && token),
        isAdmin: user?.role === 'admin',
        isLoading,
        login,
        register,
        logout,
        markBankAsLinked,
        switchToDemoUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
