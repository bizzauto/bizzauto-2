import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  MessageCircle,
  Users,
  BarChart3,
  Bot,
  Share2,
  CreditCard,
  ArrowRight,
  Check,
  Menu,
  X,
} from 'lucide-react'
import { useState } from 'react'

export default function LandingPage() {
  const { t } = useTranslation()
  const [mobileMenu, setMobileMenu] = useState(false)

  const features = [
    { icon: Users, title: 'CRM & Contacts', desc: 'Manage contacts, pipelines, and deals with visual tools' },
    { icon: MessageCircle, title: 'WhatsApp Business', desc: 'Official WhatsApp API with templates, bulk messaging & auto-reply' },
    { icon: Bot, title: 'AI-Powered', desc: 'Multi-provider AI for content generation, replies & posters' },
    { icon: Share2, title: 'Social Media', desc: 'Post to Facebook, Instagram, LinkedIn, Twitter & Google Business' },
    { icon: BarChart3, title: 'Analytics', desc: 'Real-time dashboards, reports & campaign performance tracking' },
    { icon: CreditCard, title: 'Payments', desc: 'Razorpay integration for subscriptions & e-commerce' },
  ]

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="text-2xl font-bold">
            Bizz<span className="text-blue-400">Auto</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/features" className="text-gray-400 hover:text-white">Features</Link>
            <Link to="/pricing" className="text-gray-400 hover:text-white">Pricing</Link>
            <Link to="/about" className="text-gray-400 hover:text-white">About</Link>
            <Link to="/login" className="px-4 py-2 text-gray-400 hover:text-white">Login</Link>
            <Link to="/register" className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700">
              Get Started
            </Link>
          </nav>
          <button className="md:hidden" onClick={() => setMobileMenu(!mobileMenu)}>
            {mobileMenu ? <X /> : <Menu />}
          </button>
        </div>
        {mobileMenu && (
          <div className="md:hidden border-t border-gray-800 p-4 space-y-3">
            <Link to="/features" className="block text-gray-400">Features</Link>
            <Link to="/pricing" className="block text-gray-400">Pricing</Link>
            <Link to="/login" className="block text-gray-400">Login</Link>
            <Link to="/register" className="block px-4 py-2 bg-blue-600 rounded-lg text-center">
              Get Started
            </Link>
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 py-20 text-center">
        <h1 className="text-4xl md:text-6xl font-bold mb-6">
          Automate Your Business with{' '}
          <span className="gradient-text">AI-Powered CRM</span>
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-8">
          WhatsApp marketing, CRM, AI content, social media management - all in one platform.
          Built for Indian businesses.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/register"
            className="px-8 py-3 bg-blue-600 rounded-lg text-lg font-medium hover:bg-blue-700 flex items-center justify-center gap-2"
          >
            Start Free <ArrowRight size={20} />
          </Link>
          <Link
            to="/features"
            className="px-8 py-3 border border-gray-700 rounded-lg text-lg hover:bg-gray-800"
          >
            See Features
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center mb-12">Everything You Need</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <div
              key={i}
              className="p-6 rounded-xl border border-gray-800 bg-gray-900/50 hover:border-blue-500/50 transition"
            >
              <f.icon size={32} className="text-blue-400 mb-4" />
              <h3 className="text-xl font-semibold mb-2">{f.title}</h3>
              <p className="text-gray-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-4 py-20 text-center">
        <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-2xl p-12 border border-gray-800">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-gray-400 mb-8">
            Start with our free plan. No credit card required.
          </p>
          <Link
            to="/register"
            className="px-8 py-3 bg-blue-600 rounded-lg text-lg font-medium hover:bg-blue-700"
          >
            Create Free Account
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-8">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-500">
            &copy; {new Date().getFullYear()} BizzAuto. All rights reserved.
          </p>
          <div className="flex gap-4">
            <Link to="/privacy" className="text-gray-500 hover:text-white text-sm">Privacy</Link>
            <Link to="/terms" className="text-gray-500 hover:text-white text-sm">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
