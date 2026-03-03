import { useState, useEffect, ReactNode } from 'react';
import { Sun, Moon, LogOut } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const { currentUser, logout } = useAuth();

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen transition-colors">
      {currentUser && (
              <div className="fixed top-4 right-4 z-50 flex items-center gap-4 bg-white dark:bg-gray-800 p-2 rounded-full shadow-md">
          <button
            onClick={logout}
            title="Logout"
            className="bg-gray-200 dark:bg-gray-700 p-2 rounded-full text-gray-800 dark:text-gray-200 hover:bg-red-200 dark:hover:bg-red-800 transition-colors">
            <LogOut size={18} />
          </button>
          <button
            onClick={toggleTheme}
            title="Toggle Theme"
            className="bg-gray-200 dark:bg-gray-700 p-2 rounded-full text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      )}
      {children}
    </div>
  );
}

