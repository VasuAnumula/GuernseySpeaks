"use client";

import type { User } from '@/types';
import React, { createContext, useState, ReactNode, useEffect } from 'react';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, name?: string) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate checking for an existing session
    const storedUser = localStorage.getItem('guernseySpeaksUser');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = (email: string, name: string = "Demo User") => {
    const demoUser: User = {
      id: '1',
      email: email,
      name: name,
      avatarUrl: `https://placehold.co/40x40.png?text=${name.substring(0,1)}`,
      role: 'user',
    };
    setUser(demoUser);
    localStorage.setItem('guernseySpeaksUser', JSON.stringify(demoUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('guernseySpeaksUser');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
