import { useEffect, useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

interface AuthState {
  isLoading: boolean;
  isAuthenticated: boolean;
  isHousekeepingStaff: boolean;
  userId: string | null;
}

export function useAuth(): AuthState {
  const [authState, setAuthState] = useState<AuthState>({
    isLoading: true,
    isAuthenticated: false,
    isHousekeepingStaff: false,
    userId: null,
  });

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        setAuthState({
          isLoading: false,
          isAuthenticated: false,
          isHousekeepingStaff: false,
          userId: null,
        });
        return;
      }

      // Check if user is housekeeping staff
      try {
        const housekeepingDoc = await getDoc(doc(db, 'housekeeping-staffs', user.uid));
        const isHousekeepingStaff = housekeepingDoc.exists();

        setAuthState({
          isLoading: false,
          isAuthenticated: true,
          isHousekeepingStaff,
          userId: user.uid,
        });
      } catch (error) {
        console.error('Error checking user role:', error);
        setAuthState({
          isLoading: false,
          isAuthenticated: true,
          isHousekeepingStaff: false,
          userId: user.uid,
        });
      }
    });

    return () => unsubscribe();
  }, []);

  return authState;
}
