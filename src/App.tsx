import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './lib/authStore'
import { useThemeStore } from './lib/themeStore'
import { useEffect } from 'react'

// Layouts
import AuthLayout from './layouts/AuthLayout'
import DashboardLayout from './layouts/DashboardLayout'

// Auth Pages
import LoginPage from './components/LoginPage'
import RegisterPage from './components/RegisterPage'
import ForgotPasswordPage from './components/ForgotPasswordPage'
import VerifyEmailPage from './components/VerifyEmailPage'

// Dashboard Pages
import DashboardPage from './components/DashboardPage'
import CRMPage from './components/CRMPage'
import ContactPage from './components/ContactPage'
import WhatsAppModule from './components/WhatsAppModule'
import CampaignsPage from './components/CampaignsPage'
import AutomationPage from './components/AutomationPage'
import AIChatbotPage from './components/AIChatbotPage'
import CreativeGeneratorPage from './components/CreativeGeneratorPage'
import SocialMediaPage from './components/SocialMediaPage'
import ReviewsPage from './components/ReviewsPage'
import AppointmentsPage from './components/AppointmentsPage'
import ECommercePage from './components/ECommercePage'
import DocumentsPage from './components/DocumentsPage'
import EmailMarketingPage from './components/EmailMarketingPage'
import LeadGenerationPage from './components/LeadGenerationPage'
import ReportsPage from './components/ReportsPage'
import BillingPage from './components/BillingPage'
import TeamManagement from './components/TeamManagement'
import SettingsPage from './components/SettingsPage'
import ApiKeysPage from './components/ApiKeysPage'
import AuditLogPage from './components/AuditLogPage'
import NotificationCenter from './components/NotificationCenter'
import SuperAdminDashboard from './components/SuperAdminDashboard'
import VoiceCallPage from './components/VoiceCallPage'
import GoogleBusinessPage from './components/GoogleBusinessPage'

// Public Pages
import LandingPage from './components/LandingPage'
import PricingPage from './components/PricingPage'
import FeaturesPage from './components/FeaturesPage'
import AboutPage from './components/AboutPage'
import PrivacyPage from './components/PrivacyPage'
import TermsPage from './components/TermsPage'

// Error Pages
import NotFoundPage from './components/NotFoundPage'
import ErrorBoundary from './components/ErrorBoundary'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return !isAuthenticated ? <>{children}</> : <Navigate to="/dashboard" />
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user)
  const isAdmin =
    user?.role === 'OWNER' ||
    user?.role === 'ADMIN' ||
    user?.role === 'SUPER_ADMIN'
  return isAdmin ? <>{children}</> : <Navigate to="/dashboard" />
}

function SuperAdminRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user)
  return user?.role === 'SUPER_ADMIN' ? (
    <>{children}</>
  ) : (
    <Navigate to="/dashboard" />
  )
}

export default function App() {
  const theme = useThemeStore((s) => s.theme)
  const refreshUser = useAuthStore((s) => s.refreshUser)
  const token = useAuthStore((s) => s.token)

  useEffect(() => {
    const html = document.documentElement
    html.classList.remove('light', 'dark')
    html.classList.add(theme === 'system' ? 'dark' : theme)
  }, [theme])

  useEffect(() => {
    if (token) {
      refreshUser()
    }
  }, [token, refreshUser])

  return (
    <ErrorBoundary>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/features" element={<FeaturesPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />

        {/* Auth Routes */}
        <Route element={<AuthLayout />}>
          <Route
            path="/login"
            element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicRoute>
                <RegisterPage />
              </PublicRoute>
            }
          />
          <Route
            path="/forgot-password"
            element={
              <PublicRoute>
                <ForgotPasswordPage />
              </PublicRoute>
            }
          />
          <Route
            path="/verify-email"
            element={
              <PublicRoute>
                <VerifyEmailPage />
              </PublicRoute>
            }
          />
        </Route>

        {/* Dashboard Routes */}
        <Route
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/crm" element={<CRMPage />} />
          <Route path="/contacts" element={<ContactPage />} />
          <Route path="/whatsapp" element={<WhatsAppModule />} />
          <Route path="/campaigns" element={<CampaignsPage />} />
          <Route path="/automation" element={<AutomationPage />} />
          <Route path="/ai-chatbot" element={<AIChatbotPage />} />
          <Route path="/creative" element={<CreativeGeneratorPage />} />
          <Route path="/social" element={<SocialMediaPage />} />
          <Route path="/reviews" element={<ReviewsPage />} />
          <Route path="/appointments" element={<AppointmentsPage />} />
          <Route path="/ecommerce" element={<ECommercePage />} />
          <Route path="/documents" element={<DocumentsPage />} />
          <Route path="/email" element={<EmailMarketingPage />} />
          <Route path="/leads" element={<LeadGenerationPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/billing" element={<BillingPage />} />
          <Route path="/team" element={<TeamManagement />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/api-keys" element={<ApiKeysPage />} />
          <Route path="/audit-log" element={<AuditLogPage />} />
          <Route path="/notifications" element={<NotificationCenter />} />
          <Route path="/voice" element={<VoiceCallPage />} />
          <Route path="/google-business" element={<GoogleBusinessPage />} />

          <Route
            path="/admin"
            element={
              <AdminRoute>
                <SuperAdminDashboard />
              </AdminRoute>
            }
          />
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </ErrorBoundary>
  )
}
