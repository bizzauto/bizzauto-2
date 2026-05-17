import { Link } from 'react-router-dom'
import { Check, ArrowRight } from 'lucide-react'

const plans = [
  { name: 'FREE', price: 0, features: ['100 contacts', '100 messages/mo', '1 user', '10 AI credits', 'Basic CRM'], cta: 'Get Started' },
  { name: 'STARTER', price: 999, features: ['1,000 contacts', '5,000 messages/mo', '3 users', '100 AI credits', 'Email integration', 'Priority support'], cta: 'Start Trial', popular: true },
  { name: 'GROWTH', price: 2499, features: ['10,000 contacts', '25,000 messages/mo', '10 users', '500 AI credits', 'Google Sheets sync', 'Advanced analytics', 'Custom domain'], cta: 'Start Trial' },
  { name: 'PRO', price: 4999, features: ['50,000 contacts', '100,000 messages/mo', '25 users', '2,000 AI credits', 'White label', 'API access', 'Dedicated support'], cta: 'Contact Sales' },
  { name: 'AGENCY', price: 9999, features: ['Unlimited everything', 'Unlimited businesses', 'White label', 'Custom integrations', 'SLA guarantee', 'Account manager'], cta: 'Contact Sales' },
]

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="text-2xl font-bold">
            Bizz<span className="text-blue-400">Auto</span>
          </Link>
          <Link to="/login" className="px-4 py-2 text-gray-400 hover:text-white">Login</Link>
        </div>
      </header>

      <section className="max-w-7xl mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Simple, Transparent Pricing</h1>
          <p className="text-xl text-gray-400">Start free, scale as you grow</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-xl p-6 border-2 transition ${
                plan.popular
                  ? 'border-blue-500 bg-gray-900'
                  : 'border-gray-800 bg-gray-900/50'
              }`}
            >
              {plan.popular && (
                <span className="px-2 py-1 bg-blue-600 text-xs rounded-full">Most Popular</span>
              )}
              <h3 className="text-xl font-bold mt-2">{plan.name}</h3>
              <p className="text-3xl font-bold mt-4">
                ₹{plan.price}
                <span className="text-sm font-normal text-gray-400">/mo</span>
              </p>
              <ul className="mt-6 space-y-3">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <Check size={14} className="text-green-400" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                to="/register"
                className={`mt-6 w-full block text-center px-4 py-2 rounded-lg ${
                  plan.popular
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'border border-gray-700 hover:bg-gray-800'
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
