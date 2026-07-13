import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { 
  User, 
  Building,
  Mail,
  Phone,
  MapPin,
  Save,
  Upload,
  Hash,
  X,
  UserCheck
} from 'lucide-react'

interface Profile {
  id: string
  user_name: string | null
  business_name: string | null
  business_logo: string | null
  tax_id: string | null
  contact_email: string | null
  contact_phone: string | null
  address: string | null
}

export const Settings: React.FC = () => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  
  const [formData, setFormData] = useState({
    user_name: '',
    business_name: '',
    tax_id: '',
    contact_email: '',
    contact_phone: '',
    address: ''
  })

  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      fetchProfile()
    }
  }, [user])

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      if (data) {
        setProfile(data)
        setFormData({
          user_name: data.user_name || '',
          business_name: data.business_name || '',
          tax_id: data.tax_id || '',
          contact_email: data.contact_email || '',
          contact_phone: data.contact_phone || '',
          address: data.address || ''
        })
        setLogoPreview(data.business_logo)
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file (PNG, JPG, etc.)')
        return
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB')
        return
      }

      setLogoFile(file)
      
      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const uploadLogo = async (): Promise<string | null> => {
    if (!logoFile || !user) return null

    setUploadingLogo(true)
    try {
      // Create a unique filename
      const fileExt = logoFile.name.split('.').pop()
      const fileName = `${user.id}/business-logo.${fileExt}`

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('business-logos')
        .upload(fileName, logoFile, {
          cacheControl: '3600',
          upsert: true
        })

      if (error) throw error

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('business-logos')
        .getPublicUrl(fileName)

      return publicUrl
    } catch (error) {
      console.error('Error uploading logo:', error)
      alert('Error uploading logo. Please try again.')
      return null
    } finally {
      setUploadingLogo(false)
    }
  }

  const removeLogo = async () => {
    if (!profile?.business_logo || !user) return

    try {
      // Extract filename from URL
      const url = new URL(profile.business_logo)
      const fileName = url.pathname.split('/').pop()
      
      if (fileName) {
        // Remove from storage
        await supabase.storage
          .from('business-logos')
          .remove([`${user.id}/${fileName}`])
      }

      // Update profile
      const { error } = await supabase
        .from('profiles')
        .update({ business_logo: null })
        .eq('id', user.id)

      if (error) throw error

      setLogoPreview(null)
      setLogoFile(null)
      setProfile(prev => prev ? { ...prev, business_logo: null } : null)
    } catch (error) {
      console.error('Error removing logo:', error)
      alert('Error removing logo. Please try again.')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      let logoUrl = profile?.business_logo

      // Upload new logo if selected
      if (logoFile) {
        const uploadedUrl = await uploadLogo()
        if (uploadedUrl) {
          logoUrl = uploadedUrl
        }
      }

      // Save profile
      if (profile) {
        // Update existing profile
        const { error } = await supabase
          .from('profiles')
          .update({
            user_name: formData.user_name || null,
            business_name: formData.business_name || null,
            business_logo: logoUrl,
            tax_id: formData.tax_id || null,
            contact_email: formData.contact_email || null,
            contact_phone: formData.contact_phone || null,
            address: formData.address || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', user?.id)

        if (error) throw error
      } else {
        // Create new profile
        const { error } = await supabase
          .from('profiles')
          .insert({
            id: user?.id,
            user_name: formData.user_name || null,
            business_name: formData.business_name || null,
            business_logo: logoUrl,
            tax_id: formData.tax_id || null,
            contact_email: formData.contact_email || null,
            contact_phone: formData.contact_phone || null,
            address: formData.address || null
          })

        if (error) throw error
      }

      alert('Settings saved successfully!')
      setLogoFile(null)
      fetchProfile()
    } catch (error) {
      console.error('Error saving settings:', error)
      alert('Error saving settings. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">Manage your personal and business profile information</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Information */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center mb-4">
                <UserCheck className="w-5 h-5 text-gray-400 mr-2" />
                <h2 className="text-lg font-semibold text-gray-900">Personal Information</h2>
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Name
                  </label>
                  <input
                    type="text"
                    value={formData.user_name}
                    onChange={(e) => setFormData({ ...formData, user_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Enter your full name"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    This name will appear as the creator on invoices you generate
                  </p>
                </div>
              </div>
            </div>

            {/* Business Information */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center mb-4">
                <Building className="w-5 h-5 text-gray-400 mr-2" />
                <h2 className="text-lg font-semibold text-gray-900">Business Information</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business Name
                  </label>
                  <input
                    type="text"
                    value={formData.business_name}
                    onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="OmniCargo Solutions"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tax ID / Business Number
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Hash className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      value={formData.tax_id}
                      onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="123-456-789"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center mb-4">
                <User className="w-5 h-5 text-gray-400 mr-2" />
                <h2 className="text-lg font-semibold text-gray-900">Contact Information</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contact Email
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="email"
                      value={formData.contact_email}
                      onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="contact@omnicargo.com"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Phone className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="tel"
                      value={formData.contact_phone}
                      onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business Address
                  </label>
                  <div className="relative">
                    <div className="absolute top-3 left-0 pl-3 flex items-start pointer-events-none">
                      <MapPin className="h-5 w-5 text-gray-400" />
                    </div>
                    <textarea
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      rows={3}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="123 Business Street, City, State 12345"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving || uploadingLogo}
                className="flex items-center px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors font-medium disabled:opacity-50"
              >
                <Save className="w-5 h-5 mr-2" />
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Account Overview */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Overview</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Account Email:</span>
                <span className="text-sm font-medium text-gray-900">{user?.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Account Created:</span>
                <span className="text-sm font-medium text-gray-900">
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Status:</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Active
                </span>
              </div>
            </div>
          </div>

          {/* Business Logo */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Business Logo</h3>
            
            {/* Logo Preview */}
            <div className="text-center mb-4">
              <div className="w-32 h-32 bg-gray-100 rounded-xl mx-auto mb-4 flex items-center justify-center overflow-hidden">
                {logoPreview ? (
                  <img 
                    src={logoPreview} 
                    alt="Business Logo" 
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <Building className="w-12 h-12 text-gray-400" />
                )}
              </div>
              
              {logoPreview && (
                <button
                  onClick={removeLogo}
                  className="inline-flex items-center text-sm text-red-600 hover:text-red-700 mb-3"
                >
                  <X className="w-4 h-4 mr-1" />
                  Remove Logo
                </button>
              )}
            </div>

            {/* Upload Controls */}
            <div className="space-y-3">
              <input
                type="file"
                id="logo-upload"
                accept="image/*"
                onChange={handleLogoChange}
                className="hidden"
              />
              <label
                htmlFor="logo-upload"
                className="flex items-center justify-center w-full px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                {uploadingLogo ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-500 mr-2"></div>
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    {logoPreview ? 'Change Logo' : 'Upload Logo'}
                  </>
                )}
              </label>
              
              <div className="text-xs text-gray-500 space-y-1">
                <p>• Recommended: 200x200px</p>
                <p>• Formats: PNG, JPG, GIF</p>
                <p>• Max size: 5MB</p>
                <p>• Will appear on invoices</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}