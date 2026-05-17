import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ecommerceAPI } from '../lib/api'
import { useAuthStore } from '../lib/authStore'
import { useTranslation } from 'react-i18next'
import { Plus, Edit, Trash2, X, Search, Package, ShoppingCart, Tag, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react'

export default function ECommercePage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'products' | 'orders' | 'coupons'>('products')
  const [showProductForm, setShowProductForm] = useState(false)
  const [showCouponForm, setShowCouponForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<any>(null)
  const [search, setSearch] = useState('')
  const [productData, setProductData] = useState({ name: '', description: '', price: '', stock: '', category: '' })
  const [couponData, setCouponData] = useState({ code: '', discount: '', type: 'percentage', expiresAt: '' })
  const [orderStatusUpdate, setOrderStatusUpdate] = useState<{ id: string; status: string } | null>(null)

  const { data: products } = useQuery({
    queryKey: ['ecommerce', 'products', search],
    queryFn: () => ecommerceAPI.getProducts({ search }).then((r) => r.data),
    enabled: activeTab === 'products',
  })

  const { data: orders } = useQuery({
    queryKey: ['ecommerce', 'orders'],
    queryFn: () => ecommerceAPI.getOrders().then((r) => r.data),
    enabled: activeTab === 'orders',
  })

  const { data: coupons } = useQuery({
    queryKey: ['ecommerce', 'coupons'],
    queryFn: () => ecommerceAPI.getCoupons().then((r) => r.data),
    enabled: activeTab === 'coupons',
  })

  const createProductMutation = useMutation({
    mutationFn: (data: any) => ecommerceAPI.createProduct(data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ecommerce'] })
      setShowProductForm(false)
      setProductData({ name: '', description: '', price: '', stock: '', category: '' })
    },
  })

  const updateProductMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => ecommerceAPI.updateProduct(id, data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ecommerce'] })
      setShowProductForm(false)
      setEditingProduct(null)
    },
  })

  const deleteProductMutation = useMutation({
    mutationFn: (id: string) => ecommerceAPI.deleteProduct(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ecommerce'] }),
  })

  const updateOrderStatusMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => ecommerceAPI.updateOrderStatus(id, data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ecommerce'] })
      setOrderStatusUpdate(null)
    },
  })

  const createCouponMutation = useMutation({
    mutationFn: (data: any) => ecommerceAPI.createCoupon(data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ecommerce'] })
      setShowCouponForm(false)
      setCouponData({ code: '', discount: '', type: 'percentage', expiresAt: '' })
    },
  })

  const handleProductSubmit = () => {
    const data = { ...productData, price: parseFloat(productData.price), stock: parseInt(productData.stock) }
    if (editingProduct) {
      updateProductMutation.mutate({ id: editingProduct.id, data })
    } else {
      createProductMutation.mutate(data)
    }
  }

  const openEditProduct = (product: any) => {
    setEditingProduct(product)
    setProductData({ name: product.name, description: product.description, price: product.price.toString(), stock: product.stock.toString(), category: product.category })
    setShowProductForm(true)
  }

  const tabs = [
    { id: 'products', label: t('ecommerce.products'), icon: Package },
    { id: 'orders', label: t('ecommerce.orders'), icon: ShoppingCart },
    { id: 'coupons', label: t('ecommerce.coupons'), icon: Tag },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/20 text-yellow-400'
      case 'processing': return 'bg-blue-500/20 text-blue-400'
      case 'shipped': return 'bg-purple-500/20 text-purple-400'
      case 'delivered': return 'bg-green-500/20 text-green-400'
      case 'cancelled': return 'bg-red-500/20 text-red-400'
      default: return 'bg-gray-500/20 text-gray-400'
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl md:text-3xl font-bold text-white">{t('ecommerce.title')}</h1>
        <div className="flex gap-2">
          {activeTab === 'products' && (
            <button onClick={() => { setEditingProduct(null); setProductData({ name: '', description: '', price: '', stock: '', category: '' }); setShowProductForm(true) }} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium">
              <Plus className="w-5 h-5" />{t('ecommerce.addProduct')}
            </button>
          )}
          {activeTab === 'coupons' && (
            <button onClick={() => setShowCouponForm(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium">
              <Plus className="w-5 h-5" />{t('ecommerce.addCoupon')}
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-2 border-b border-gray-700">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-400 hover:text-white'}`}>
            <tab.icon className="w-4 h-4" />{tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'products' && (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white" placeholder={t('ecommerce.searchProducts')} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products?.items?.map((product: any) => (
              <div key={product.id} className="glass-effect rounded-xl p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{product.name}</h3>
                    <p className="text-sm text-gray-400">{product.category}</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEditProduct(product)} className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-blue-400"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => deleteProductMutation.mutate(product.id)} className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-2 line-clamp-2">{product.description}</p>
                <div className="flex items-center justify-between mt-4">
                  <span className="text-xl font-bold text-green-400">₹{product.price}</span>
                  <span className={`text-sm ${product.stock > 0 ? 'text-green-400' : 'text-red-400'}`}>{product.stock} {t('ecommerce.inStock')}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {activeTab === 'orders' && (
        <div className="space-y-3">
          {orders?.items?.map((order: any) => (
            <div key={order.id} className="glass-effect rounded-xl p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="text-white font-medium">{t('ecommerce.order', { id: order.id.slice(0, 8) })}</p>
                  <p className="text-sm text-gray-400">{order.customerName} • {new Date(order.createdAt).toLocaleDateString()}</p>
                  <p className="text-sm text-gray-500">{order.items?.length} {t('ecommerce.items')}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-white">₹{order.total}</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>{order.status}</span>
                  <select value={orderStatusUpdate && orderStatusUpdate.id === order.id ? orderStatusUpdate.status : order.status} onChange={(e) => {
                    if (orderStatusUpdate?.id === order.id) {
                      updateOrderStatusMutation.mutate({ id: order.id, data: { status: e.target.value } })
                    } else {
                      setOrderStatusUpdate({ id: order.id, status: e.target.value })
                    }
                  }} className="px-3 py-1 rounded-lg bg-gray-800/50 border border-gray-700 text-white text-sm">
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'coupons' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {coupons?.map((coupon: any) => (
            <div key={coupon.code} className="glass-effect rounded-xl p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-bold text-white font-mono">{coupon.code}</p>
                  <p className="text-sm text-gray-400">{coupon.discount}% {coupon.type}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${coupon.active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{coupon.active ? t('common.active') : t('common.inactive')}</span>
              </div>
              {coupon.expiresAt && <p className="text-xs text-gray-500 mt-2">{t('ecommerce.expires')}: {new Date(coupon.expiresAt).toLocaleDateString()}</p>}
            </div>
          ))}
        </div>
      )}

      {showProductForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="glass-effect rounded-xl p-6 w-full max-w-lg space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">{editingProduct ? t('ecommerce.editProduct') : t('ecommerce.addProduct')}</h3>
              <button onClick={() => setShowProductForm(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <input value={productData.name} onChange={(e) => setProductData({ ...productData, name: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white" placeholder={t('ecommerce.productName')} />
              <textarea value={productData.description} onChange={(e) => setProductData({ ...productData, description: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white" rows={3} placeholder={t('ecommerce.description')} />
              <div className="grid grid-cols-2 gap-3">
                <input type="number" value={productData.price} onChange={(e) => setProductData({ ...productData, price: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white" placeholder={t('ecommerce.price')} />
                <input type="number" value={productData.stock} onChange={(e) => setProductData({ ...productData, stock: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white" placeholder={t('ecommerce.stock')} />
              </div>
              <input value={productData.category} onChange={(e) => setProductData({ ...productData, category: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white" placeholder={t('ecommerce.category')} />
            </div>
            <div className="flex gap-2">
              <button onClick={handleProductSubmit} disabled={createProductMutation.isPending || updateProductMutation.isPending} className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-50">{t('common.save')}</button>
              <button onClick={() => setShowProductForm(false)} className="flex-1 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-medium">{t('common.cancel')}</button>
            </div>
          </div>
        </div>
      )}

      {showCouponForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="glass-effect rounded-xl p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">{t('ecommerce.addCoupon')}</h3>
              <button onClick={() => setShowCouponForm(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <input value={couponData.code} onChange={(e) => setCouponData({ ...couponData, code: e.target.value.toUpperCase() })} className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white font-mono" placeholder={t('ecommerce.couponCode')} />
              <input type="number" value={couponData.discount} onChange={(e) => setCouponData({ ...couponData, discount: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white" placeholder={t('ecommerce.discount')} />
              <select value={couponData.type} onChange={(e) => setCouponData({ ...couponData, type: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white">
                <option value="percentage">{t('ecommerce.percentage')}</option>
                <option value="fixed">{t('ecommerce.fixed')}</option>
              </select>
              <input type="date" value={couponData.expiresAt} onChange={(e) => setCouponData({ ...couponData, expiresAt: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white" />
            </div>
            <button onClick={() => createCouponMutation.mutate(couponData)} disabled={!couponData.code || !couponData.discount} className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-50">{t('common.create')}</button>
          </div>
        </div>
      )}
    </div>
  )
}
