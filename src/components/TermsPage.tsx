import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="text-2xl font-bold">Bizz<span className="text-blue-400">Auto</span></Link>
          <Link to="/" className="flex items-center gap-2 text-gray-400 hover:text-white">
            <ArrowLeft size={16} /> Back
          </Link>
        </div>
      </header>
      <section className="max-w-3xl mx-auto px-4 py-20">
        <h1 className="text-3xl font-bold mb-8">Terms of Service</h1>
        <div className="space-y-6 text-gray-300">
          <p>Last updated: {new Date().toLocaleDateString()}</p>
          <h2 className="text-xl font-semibold text-white">1. Acceptance of Terms</h2>
          <p>By accessing or using BizzAuto, you agree to be bound by these Terms of Service.</p>
          <h2 className="text-xl font-semibold text-white">2. Use of Service</h2>
          <p>You must use the service in compliance with all applicable laws and regulations.</p>
          <h2 className="text-xl font-semibold text-white">3. Account Responsibility</h2>
          <p>You are responsible for maintaining the security of your account credentials.</p>
          <h2 className="text-xl font-semibold text-white">4. Prohibited Uses</h2>
          <p>You may not use the service for spam, fraud, or any illegal activities.</p>
          <h2 className="text-xl font-semibold text-white">5. Limitation of Liability</h2>
          <p>BizzAuto shall not be liable for any indirect, incidental, or consequential damages.</p>
        </div>
      </section>
    </div>
  )
}
