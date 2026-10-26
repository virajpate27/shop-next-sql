// src/app/(shop)/profile/page.js
'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  User, MapPin, Plus, Pencil, Trash2, X, Loader2, Phone,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import {
  getAddresses,
  addAddress,
  removeAddress,
  updateAddresses,
} from '@/lib/api/addresses'

const EMPTY_ADDRESS = {
  label: 'Home',
  fullName: '',
  phone: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  pincode: '',
  isDefault: false,
}

const INDIAN_STATES = [
  'Andhra Pradesh', 'Bihar', 'Delhi', 'Goa', 'Gujarat', 'Karnataka', 'Kerala',
  'Madhya Pradesh', 'Maharashtra', 'Punjab', 'Rajasthan', 'Tamil Nadu',
  'Telangana', 'Uttar Pradesh', 'West Bengal',
]

export default function ProfilePage() {
  const { user, profile, loading: authLoading, setProfile } = useAuth()
  const router = useRouter()

  const [name, setName] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)

  const [addresses, setAddresses] = useState([])
  const [loadingAddresses, setLoadingAddresses] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingAddress, setEditingAddress] = useState(null)
  const [form, setForm] = useState(EMPTY_ADDRESS)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?redirect=/profile')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (profile?.displayName) setName(profile.displayName)
  }, [profile])

  useEffect(() => {
    async function loadAddresses() {
      if (!user) return
      setLoadingAddresses(true)
      try {
        const result = await getAddresses(user.uid)
        setAddresses(result)
      } finally {
        setLoadingAddresses(false)
      }
    }
    loadAddresses()
  }, [user])

  async function handleSaveProfile(e) {
    e.preventDefault()
    if (!name.trim()) return toast.error('Name cannot be empty')

    setSavingProfile(true)
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PATCH', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: name.trim() }),
      })
      if (!res.ok) throw new Error('update failed')
      setProfile((prev) => ({ ...prev, displayName: name.trim() }))
      toast.success('Profile updated')
    } catch {
      toast.error('Failed to update profile')
    } finally {
      setSavingProfile(false)
    }
  }

  function openAddAddress() {
    setEditingAddress(null)
    setForm(EMPTY_ADDRESS)
    setShowModal(true)
  }

  function openEditAddress(address) {
    setEditingAddress(address)
    setForm(address)
    setShowModal(true)
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  async function handleSaveAddress(e) {
    e.preventDefault()
    if (!form.fullName || !form.phone || !form.line1 || !form.city || !form.state || !form.pincode) {
      return toast.error('Please fill all required fields')
    }
    if (!/^\d{10}$/.test(form.phone)) {
      return toast.error('Enter a valid 10-digit phone number')
    }
    if (!/^\d{6}$/.test(form.pincode)) {
      return toast.error('Enter a valid 6-digit pincode')
    }

    setSaving(true)
    try {
      if (editingAddress) {
        // Replace the edited address in-place
        const updated = addresses.map((a) =>
          a.id === editingAddress.id ? { ...form, id: editingAddress.id } : a
        )
        await updateAddresses(user.uid, updated)
        setAddresses(updated)
        toast.success('Address updated')
      } else {
        const newAddr = await addAddress(user.uid, form)
        setAddresses((prev) => [...prev, newAddr])
        toast.success('Address added')
      }
      setShowModal(false)
    } catch {
      toast.error('Failed to save address')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteAddress(address) {
    if (!confirm('Delete this address?')) return
    try {
      await removeAddress(user.uid, address)
      setAddresses((prev) => prev.filter((a) => a.id !== address.id))
      toast.success('Address removed')
    } catch {
      toast.error('Failed to remove address')
    }
  }

  if (authLoading || !user) return null

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Account settings</h1>

      {/* Profile info */}
      <section className="bg-white border border-gray-100 rounded-2xl p-6 mb-6">
        <div className="flex items-center gap-2 mb-5">
          <User className="w-5 h-5 text-indigo-600" />
          <h2 className="font-semibold text-gray-900">Personal information</h2>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Full name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input
                value={user.email}
                disabled
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 text-gray-400"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={savingProfile}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors disabled:opacity-60 flex items-center gap-2"
          >
            {savingProfile && <Loader2 className="w-4 h-4 animate-spin" />}
            Save changes
          </button>
        </form>
      </section>

      {/* Addresses */}
      <section className="bg-white border border-gray-100 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-indigo-600" />
            <h2 className="font-semibold text-gray-900">Saved addresses</h2>
          </div>
          <button
            onClick={openAddAddress}
            className="flex items-center gap-1.5 text-sm text-indigo-600 font-medium hover:text-indigo-700"
          >
            <Plus className="w-4 h-4" /> Add new
          </button>
        </div>

        {loadingAddresses ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
          </div>
        ) : addresses.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-10">
            No saved addresses yet. Add one to speed up checkout.
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {addresses.map((addr) => (
              <div
                key={addr.id}
                className="border border-gray-200 rounded-xl p-4 relative"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">
                    {addr.label}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditAddress(addr)}
                      className="p-1.5 text-gray-400 hover:text-indigo-600 transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteAddress(addr)}
                      className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <p className="text-sm font-medium text-gray-900">{addr.fullName}</p>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}<br />
                  {addr.city}, {addr.state} — {addr.pincode}
                </p>
                <p className="text-sm text-gray-400 mt-1 flex items-center gap-1">
                  <Phone className="w-3 h-3" /> {addr.phone}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Address modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">
                {editingAddress ? 'Edit address' : 'Add new address'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-xl">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSaveAddress} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Label</label>
                <div className="flex gap-2">
                  {['Home', 'Work', 'Other'].map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, label: l }))}
                      className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        form.label === l
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Full name <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="fullName"
                    value={form.fullName}
                    onChange={handleChange}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Phone <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="10-digit number"
                    maxLength={10}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Address line 1 <span className="text-red-500">*</span>
                </label>
                <input
                  name="line1"
                  value={form.line1}
                  onChange={handleChange}
                  placeholder="House no, building, street"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Address line 2</label>
                <input
                  name="line2"
                  value={form.line2}
                  onChange={handleChange}
                  placeholder="Landmark, area (optional)"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="city"
                    value={form.city}
                    onChange={handleChange}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    State <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="state"
                    value={form.state}
                    onChange={handleChange}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="">Select</option>
                    {INDIAN_STATES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Pincode <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="pincode"
                    value={form.pincode}
                    onChange={handleChange}
                    maxLength={6}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="isDefault"
                  checked={form.isDefault}
                  onChange={handleChange}
                  className="w-4 h-4 accent-indigo-600"
                />
                <span className="text-sm text-gray-700">Set as default address</span>
              </label>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl font-medium hover:bg-gray-50 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl font-medium transition-colors text-sm disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save address
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}