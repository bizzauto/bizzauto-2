import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { businessAPI, subscriptionAPI } from '../lib/api'
import { useTranslation } from 'react-i18next'
import { CreditCard, Building2, Phone, Mail, MapPin, Globe, Clock, Upload } from 'lucide-react'

export default function BillingPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [upgradePlan, setUpgradePlan] = useState<string | null>(null)

  const { data: businessData } = useQuery({
    queryKey: ['business'],
    queryFn: () => businessAPI.get().then((r) => r.data.data),
  })

  const { data: planData } = useQuery({
    queryKey: ['subscription-plan'],
    queryFn: () => subscriptionAPI.getPlan().then((r) => r.data.data),
  })

  const { data: invoices } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => subscriptionAPI.getInvoices().then((r) => r.data.data),
  })

  const upgradeMutation = useMutation({
    mutationFn: (plan: string) => subscriptionAPI.upgrade({ plan }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-plan'] })
      setUpgradePlan(null)
    },
  })

  const cancelMutation = useMutation({
    mutationFn: () => subscriptionAPI.cancel(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-plan'] })
    },
  })

  const plans = [
    { name: 'FREE', price: 0, features: ['100 contacts', '100 messages/mo', '1 user', '10 AI credits'] },
    { name: 'STARTER', price: 999, features: ['1,000 contacts', '5,000 messages/mo', '3 users', '100 AI credits'] },
    { name: 'GROWTH', price: 2499, features: ['10,000 contacts', '25,000 messages/mo', '10 users', '500 AI credits'] },
    { name: 'PRO', price: 4999, features: ['50,000 contacts', '100,000 messages/mo', '25 users', '2,000 AI credits'] },
    { name: 'AGENCY', price: 9999, features: ['Unlimited contacts', 'Unlimited messages', 'Unlimited users', '10,000 AI credits'] },
  ]

  const currentPlan = businessData?.plan || 'FREE'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('settings.billing') || 'Billing & Plans'}
        </h1>
        <p className="text-gray-500 dark:text-gray-400">Manage your subscription</p>
      </div>

      {/* Current Plan */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Current Plan</p>
            <p className="text-2xl font-bold">{currentPlan}</p>
            {planData?.currentPeriodEnd && (
              <p className="text-sm text-gray-400">
                Renews: {new Date(planData.currentPeriodEnd).toLocaleDateString()}
              </p>
            )}
          </div>
          {currentPlan !== 'FREE' && (
            <button
              onClick={() => cancelMutation.mutate()}
              className="px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              Cancel Plan
            </button>
          )}
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`rounded-xl p-6 border-2 transition ${
              plan.name === currentPlan
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
            }`}
          >
            <h3 className="text-lg font-bold">{plan.name}</h3>
            <p className="text-2xl font-bold mt-2">
              ₹{plan.price}
              <span className="text-sm font-normal text-gray-500">/mo</span>
            </p>
            <ul className="mt-4 space-y-2 text-sm">
              {plan.features.map((f, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                  {f}
                </li>
              ))}
            </ul>
            {plan.name !== currentPlan && (
              <button
                onClick={() => upgradeMutation.mutate(plan.name)}
                className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Upgrade
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Business Info */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold mb-4">Business Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <Building2 size={18} className="text-gray-400" />
            <div>
              <p className="text-sm text-gray-500">Name</p>
              <p>{businessData?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Phone size={18} className="text-gray-400" />
            <div>
              <p className="text-sm text-gray-500">Phone</p>
              <p>{businessData?.phone || '-'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Mail size={18} className="text-gray-400" />
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p>{businessData?.email || '-'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <MapPin size={18} className="text-gray-400" />
            <div>
              <p className="text-sm text-gray-500">Location</p>
              <p>{[businessData?.city, businessData?.state].filter(Boolean).join(', ') || '-'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Invoices */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold mb-4">Invoices</h3>
        {invoices?.length === 0 ? (
          <p className="text-gray-500">No invoices yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-2">Invoice #</th>
                  <th className="text-left py-2">Amount</th>
                  <th className="text-left py-2">Status</th>
                  <th className="text-left py-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {invoices?.map((inv: any) => (
                  <tr key={inv.id} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="py-2">{inv.invoiceNumber}</td>
                    <td className="py-2">₹{(inv.amount / 100).toFixed(2)}</td>
                    <td className="py-2">
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          inv.status === 'paid'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-2">{new Date(inv.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
