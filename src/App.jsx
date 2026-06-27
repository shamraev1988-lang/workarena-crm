import { Toaster } from 'sonner'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/lib/AuthContext'
import { PermissionProvider } from '@/lib/PermissionContext'
import ProtectedRoute from '@/components/ProtectedRoute'

import Login from '@/pages/Login'
import Register from '@/pages/Register'
import ForgotPassword from '@/pages/ForgotPassword'
import ResetPassword from '@/pages/ResetPassword'

import AppLayout from '@/components/layout/AppLayout'
import Dashboard from '@/pages/Dashboard'
import Shifts from '@/pages/Shifts'
import Employees from '@/pages/Employees'
import Clients from '@/pages/Clients'
import Finance from '@/pages/Finance'
import Reports from '@/pages/Reports'
import Settings from '@/pages/Settings'
import UsersPage from '@/pages/settings/Users'
import RolesPage from '@/pages/settings/Roles'

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <PermissionProvider>
          <Router>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/shifts" element={<Shifts />} />
                  <Route path="/employees" element={<Employees />} />
                  <Route path="/clients" element={<Clients />} />
                  <Route path="/finance" element={<Finance />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/settings/users" element={<UsersPage />} />
                  <Route path="/settings/roles" element={<RolesPage />} />
                </Route>
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Router>
          <Toaster richColors position="top-right" />
        </PermissionProvider>
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
