import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function PrivacyPage() {
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
        <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
        <div className="space-y-6 text-gray-300">
          <p>Last updated: {new Date().toLocaleDateString()}</p>
          <h2 className="text-xl font-semibold text-white">1. Information We Collect</h2>
          <p>We collect information you provide directly, including name, email, phone number, and business details.</p>
          <h2 className="text-xl font-semibold text-white">2. How We Use Information</h2>
          <p>We use collected information to provide, maintain, and improve our services.</p>
          <h2 className="text-xl font-semibold text-white">3. Data Security</h2>
          <p>We implement industry-standard security measures including AES-256 encryption, JWT authentication, and regular security audits.</p>
          <h2 className="text-xl font-semibold text-white">4. Data Sharing</h2>
          <p>We do not sell your personal information. We share data only with your consent or as required by law.</p>
          <h2 className="text-xl font-semibold text-white">5. Your Rights</h2>
          <p>You have the right to access, modify, or delete your personal data at any time.</p>
        </div>
      </section>
    </div>
  )
}
