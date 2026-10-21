import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { BankProvider } from './context/BankContext';
import { AppRoutes } from './routes/AppRoutes';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <BankProvider>
          <AppRoutes />
        </BankProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
