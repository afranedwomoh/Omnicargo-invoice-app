import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { AuthContainer } from './components/Auth/AuthContainer'
import { MfaGate } from './components/Auth/MfaGate'
import { ResetPasswordForm } from './components/Auth/ResetPasswordForm'
import { Layout } from './components/Layout/Layout'
import { Dashboard } from './pages/Dashboard'
import { Invoices } from './pages/Invoices'
import { InvoiceForm } from './pages/InvoiceForm'
import { LocalDeliveryForm } from './pages/LocalDeliveryForm'
import { Clients } from './pages/Clients'
import { Analysis } from './pages/Analysis'
import { ShipmentPricing } from './pages/ShipmentPricing'
import { Settings } from './pages/Settings'

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  if (!user) {
    return <AuthContainer />
  }

  return (
    <MfaGate>
      <Layout>{children}</Layout>
    </MfaGate>
  )
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/reset-password" element={<ResetPasswordForm />} />
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/invoices" element={
            <ProtectedRoute>
              <Invoices />
            </ProtectedRoute>
          } />
          <Route path="/invoices/new" element={
            <ProtectedRoute>
              <InvoiceForm />
            </ProtectedRoute>
          } />
          <Route path="/local-delivery/new" element={
            <ProtectedRoute>
              <LocalDeliveryForm />
            </ProtectedRoute>
          } />
          <Route path="/local-delivery/edit/:id" element={
            <ProtectedRoute>
              <LocalDeliveryForm />
            </ProtectedRoute>
          } />
          <Route path="/invoices/edit/:id" element={
            <ProtectedRoute>
              <InvoiceForm />
            </ProtectedRoute>
          } />
          <Route path="/clients" element={
            <ProtectedRoute>
              <Clients />
            </ProtectedRoute>
          } />
          <Route path="/analysis" element={
            <ProtectedRoute>
              <Analysis />
            </ProtectedRoute>
          } />
          <Route path="/shipment-pricing" element={
            <ProtectedRoute>
              <ShipmentPricing />
            </ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          } />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App
