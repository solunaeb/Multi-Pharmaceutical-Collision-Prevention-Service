'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface ProfileContextValue {
  selectedProfileId: string | null;
  setSelectedProfileId: (id: string | null) => void;
}

const ProfileContext = createContext<ProfileContextValue | undefined>(undefined);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('selectedProfileId');
    if (stored) setSelectedProfileId(stored);
  }, []);

  useEffect(() => {
    if (selectedProfileId) {
      localStorage.setItem('selectedProfileId', selectedProfileId);
    } else {
      localStorage.removeItem('selectedProfileId');
    }
  }, [selectedProfileId]);

  return (
    <ProfileContext.Provider value={{ selectedProfileId, setSelectedProfileId }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (!context) throw new Error('useProfile must be used within ProfileProvider');
  return context;
}
