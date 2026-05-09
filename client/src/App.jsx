import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

import './styles/auth.css';       
import './styles/dashboard.css';
import './styles/GameDetails.css';

const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));
const Home = lazy(() => import('./pages/dashboard/Home'));
const Wishlist = lazy(() => import('./pages/dashboard/Wishlist'));
const MyStatus = lazy(() => import('./pages/dashboard/MyStatus'));
const People = lazy(() => import('./pages/social/People'));
const PublicProfile = lazy(() => import('./pages/social/PublicProfile'));
const ProfileLibrary = lazy(() => import('./pages/social/ProfileLibrary'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const ManageUsers = lazy(() => import('./pages/admin/ManageUsers'));
const AdminUserLibrary = lazy(() => import('./pages/admin/AdminUserLibrary'));
const AdminSocial = lazy(() => import('./pages/admin/AdminSocial'));

// Shared suspense fallback so route-level lazy loading still feels intentional.
const PageLoader = () => (
  <div style={{ 
    height: '100vh', 
    display: 'flex', 
    flexDirection: 'column',
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: '#000',
    overflow: 'hidden' 
  }}>
    <svg 
      width="120px" 
      height="120px" 
      viewBox="0 0 100 100" 
      className="crate-on-logo-structure"
    >
      <g fill="none" stroke="#ffffff" strokeWidth="4" strokeLinecap="square">
        <path d="M10 20 H90 V90 H50 V60 H70 V75 H80 V30 H20 V90 H10 V20 Z" />
        <path d="M35 50 V70 M35 70 H65 M35 50 H65 M65 50 L80 65" strokeWidth="3" />
      </g>
    </svg>

    <p style={{
        marginTop: '24px', 
        color: '#fff', 
        fontSize: '11px', 
        fontWeight: '800', 
        textTransform: 'uppercase', 
        letterSpacing: '2px',
        animation: 'textFade 1.6s infinite both'
    }}>Loading Experience</p>

    <style>{`
      @keyframes structurePulse {
        0% { opacity: 0.15; transform: scale(0.97); }
        50% { opacity: 1; transform: scale(1); }
        100% { opacity: 0.15; transform: scale(0.97); }
      }
      @keyframes textFade {
        0% { opacity: 0.3; }
        50% { opacity: 1; }
        100% { opacity: 0.3; }
      }
      .crate-on-logo-structure {
        animation: structurePulse 1.6s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        will-change: transform, opacity;
      }
    `}</style>
  </div>
);

function App() {
  return (
    // AuthProvider wraps the entire router so every page can react to login/logout changes.
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/guest" element={<Home />} />

            <Route element={<ProtectedRoute />}>
              {/* Home is the main authenticated experience for regular users and admins. */}
              <Route path="/home" element={<Home />} />
              <Route path="/wishlist" element={<Wishlist />} />
              <Route path="/status" element={<MyStatus />} />
              <Route path="/people" element={<People />} />
              <Route path="/profile/:userId" element={<PublicProfile />} />
              <Route path="/profile/:userId/library" element={<ProfileLibrary />} />
              {/* <Route path="/game/:id" element={<GameDetails />} /> */}
            </Route>

            <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
              {/* Admin routes are grouped under a stricter role gate. */}
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/users" element={<ManageUsers />} />
              <Route path="/admin/users/:userId/library" element={<AdminUserLibrary />} />
              <Route path="/admin/social" element={<AdminSocial />} />
            </Route> 

          </Routes> 
        </Suspense>
      </BrowserRouter>
    </AuthProvider>  
  );
}

export default App;
