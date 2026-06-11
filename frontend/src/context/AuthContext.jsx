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
    window.location.href = '/loginuser.php?next=/';
  };

  const logout = () => {
    // There is logout_users.php in root directory
    window.location.href = '/logout_users.php?next=/';
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
