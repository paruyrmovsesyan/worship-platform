import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/auth_me.php')
      .then(res => res.json())
      .then(data => {
        if (data && data.loggedIn) {
          setUser(data.user);
        } else {
          setUser(null);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Auth check failed', err);
        setUser(null);
        setLoading(false);
      });
  }, []);

  const login = () => {
    var url = '/login?next=/';
    if (window.WP && typeof window.WP.navigate === 'function') {
      window.WP.navigate(url, { loaderDelay: 50, navigationDelay: 70 });
    } else {
      window.location.href = url;
    }
  };

  const logout = () => {
    var url = '/logout_users.php?next=/';
    if (window.WP && typeof window.WP.navigate === 'function') {
      window.WP.navigate(url, { loaderDelay: 50, navigationDelay: 70 });
    } else {
      window.location.href = url;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
