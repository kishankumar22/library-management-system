'use client';

import { ReactNode, useEffect, useState } from 'react';

export interface User {
  [x: string]: ReactNode;
  name: string;
  profilePic?: string | null;
}

export function useUser(): User | null {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('UserDetails');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const userData = parsed.user || {};

        const name =
          userData.name ||
          (userData.fName && userData.lName ? `${userData.fName} ${userData.lName}` : 'User');

        const profilePic = userData.profilePic || userData.studentImage || null;

        setUser({ name, profilePic });
      } catch (error) {
        console.error('Failed to parse user data:', error);
      }
    }
  }, []);

  return user;
}
