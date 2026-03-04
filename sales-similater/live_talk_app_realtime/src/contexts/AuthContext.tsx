import { createContext, useContext, useEffect, useState } from 'react';
import { User, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase-config';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      const allowedDomain = process.env.REACT_APP_ALLOWED_DOMAIN;
      
      if (user) {
        // ドメイン制限がある場合はチェック
        if (allowedDomain && !user.email?.endsWith(`@${allowedDomain}`)) {
          console.warn('許可されていないドメインです:', user.email);
          signOut(auth);
          setUser(null);
        } else {
          setUser(user);
        }
      } else {
        setUser(null);
      }
      
      setLoading(false);
    });
    
    return unsubscribe;
  }, []);

  const login = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const allowedDomain = process.env.REACT_APP_ALLOWED_DOMAIN;
      
      // ドメイン制限がある場合はチェック
      if (allowedDomain && !result.user.email?.endsWith(`@${allowedDomain}`)) {
        await signOut(auth);
        throw new Error(`社内アカウント(@${allowedDomain})でログインしてください`);
      }
    } catch (error: any) {
      console.error('ログインエラー:', error);
      throw error;
    }
  };

  const logout = () => signOut(auth);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
