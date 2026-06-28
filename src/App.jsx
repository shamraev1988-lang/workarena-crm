import { Toaster } from 'sonner'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/lib/AuthContext'
import { PermissionProvider } from '@/lib/PermissionContext'
import { SettingsProvider } from '@/lib/SettingsContext'
import ProtectedRoute from '@/components/ProtectedRoute'

import Login from '@/pages/Login'
import Register from '@/pages/Register'
import ForgotPassword from '@/pages/ForgotPassword'
import ResetPassword from '@/pages/ResetPassword'
import PublicOrder from '@/pages/PublicOrder'

import AppLayout from '@/components/layout/AppLayout'
import Dashboard from '@/pages/Dashboard'
import Orders from '@/pages/Orders'
import Checkin from '@/pages/Checkin'
import Shifts from '@/pages/Shifts'
import Employees from '@/pages/Employees'
import Clients from '@/pages/Clients'
import Finance from '@/pages/Finance'
import Payouts from '@/pages/Payouts'
import Reports from '@/pages/Reports'
import Settings from '@/pages/Settings'
import UsersPage from '@/pages/settings/Users'
import RolesPage from '@/pages/settings/Roles'
import CompanySettings from '@/pages/settings/Company'
import Dictionaries from '@/pages/settings/Dictionaries'
import PipelinesSettings from '@/pages/settings/Pipelines'

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <PermissionProvider>
          <SettingsProvider>
          <Router>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/zayavka/:clientId" element={<PublicOrder />} />
              <Route path="/zayavka" element={<PublicOrder />} />

              <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/orders" element={<Orders />} />
                  <Route path="/checkin" element={<Checkin />} />
                  <Route path="/shifts" element={<Shifts />} />
                  <Route path="/employees" element={<Employees />} />
                  <Route path="/clients" element={<Clients />} />
                  <Route path="/finance" element={<Finance />} />
                  <Route path="/payouts" element={<Payouts />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/settings/users" element={<UsersPage />} />
                  <Route path="/settings/roles" element={<RolesPage />} />
                  <Route path="/settings/company" element={<CompanySettings />} />
                  <Route path="/settings/dictionaries" element={<Dictionaries />} />
                  <Route path="/settings/pipelines" element={<PipelinesSettings />} />
                </Route>
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Router>
          <Toaster richColors position="top-right" />
          </SettingsProvider>
        </PermissionProvider>
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
