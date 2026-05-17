import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function AboutPage() {
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
        <h1 className="text-4xl font-bold mb-8">About BizzAuto</h1>
        <div className="prose prose-invert max-w-none">
          <p className="text-lg text-gray-300 mb-6">
            BizzAuto is a comprehensive business automation platform designed for Indian SMBs and agencies.
            We combine CRM, WhatsApp Business API, AI-powered content generation, social media management,
            and multi-channel marketing into one powerful platform.
          </p>
          <p className="text-gray-400 mb-6">
            Our mission is to make enterprise-grade automation accessible to businesses of all sizes.
            Whether you're a small shop in Mumbai or a growing agency in Bangalore, BizzAuto provides
            the tools you need to engage customers, automate workflows, and scale your operations.
          </p>
          <h2 className="text-2xl font-bold mt-8 mb-4">Why BizzAuto?</h2>
          <ul className="space-y-2 text-gray-300">
            <li>Built specifically for the Indian market</li>
            <li>Official WhatsApp Business API integration</li>
            <li>Multi-provider AI with free tier support</li>
            <li>Razorpay payment integration</li>
            <li>Multi-language support (English & Hindi)</li>
            <li>Affordable pricing starting from free</li>
          </ul>
        </div>
      </section>
    </div>
  )
}
