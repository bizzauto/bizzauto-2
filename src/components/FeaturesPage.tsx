import { Link } from 'react-router-dom'
import { MessageCircle, Users, BarChart3, Bot, Share2, CreditCard, ArrowLeft } from 'lucide-react'

const featureCategories = [
  {
    title: 'CRM & Lead Management',
    icon: Users,
    features: ['Contact management with tags', 'Visual sales pipelines', 'Deal tracking', 'Activity timeline', 'Bulk import/export', 'Lead scoring'],
  },
  {
    title: 'WhatsApp Business API',
    icon: MessageCircle,
    features: ['Official Meta API', 'Template messages', 'Bulk messaging', 'Auto-reply', 'Chatbot flows', 'Message status tracking'],
  },
  {
    title: 'AI-Powered Features',
    icon: Bot,
    features: ['Multi-provider AI', 'Content generation', 'Poster creation', 'Smart replies', 'AI credit tracking', 'Fallback system'],
  },
  {
    title: 'Social Media',
    icon: Share2,
    features: ['Facebook posting', 'Instagram publishing', 'LinkedIn posts', 'Twitter/X tweets', 'Google Business posts', 'Scheduling'],
  },
  {
    title: 'Analytics & Reports',
    icon: BarChart3,
    features: ['Real-time dashboard', 'Contact growth trends', 'Campaign analytics', 'Revenue reports', 'Export to CSV', 'Custom date ranges'],
  },
  {
    title: 'Payments & Billing',
    icon: CreditCard,
    features: ['Razorpay integration', 'Multi-tier plans', 'Trial periods', 'Usage limits', 'Invoice generation', 'Subscription management'],
  },
]

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="text-2xl font-bold">
            Bizz<span className="text-blue-400">Auto</span>
          </Link>
          <Link to="/" className="flex items-center gap-2 text-gray-400 hover:text-white">
            <ArrowLeft size={16} /> Back
          </Link>
        </div>
      </header>

      <section className="max-w-7xl mx-auto px-4 py-20">
        <h1 className="text-4xl font-bold text-center mb-4">Powerful Features</h1>
        <p className="text-xl text-gray-400 text-center mb-16">
          Everything you need to automate and grow your business
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {featureCategories.map((cat, i) => (
            <div key={i} className="p-6 rounded-xl border border-gray-800 bg-gray-900/50">
              <div className="flex items-center gap-3 mb-4">
                <cat.icon size={28} className="text-blue-400" />
                <h2 className="text-xl font-bold">{cat.title}</h2>
              </div>
              <ul className="space-y-2">
                {cat.features.map((f, j) => (
                  <li key={j} className="flex items-center gap-2 text-gray-300">
                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
