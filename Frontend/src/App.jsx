import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import AppRoutes from './components/AppRoutes';

const App = () => (
  <AuthProvider>
    <AppRoutes />
    {/* The app called toast() from a dozen places but never rendered a
        Toaster, so no message ever appeared. */}
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: '#0f172a',
          color: '#f8fafc',
          fontSize: '14px',
          borderRadius: '10px',
          padding: '10px 14px'
        },
        success: { iconTheme: { primary: '#10b981', secondary: '#f8fafc' } },
        error: { duration: 6000, iconTheme: { primary: '#ef4444', secondary: '#f8fafc' } }
      }}
    />
  </AuthProvider>
);

export default App;
