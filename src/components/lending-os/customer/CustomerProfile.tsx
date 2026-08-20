'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  User,
  Phone,
  Mail,
  MapPin,
  Building2,
  CreditCard,
  Lock,
  Shield,
  Camera,
  Save,
  Edit3,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Key,
  Smartphone,
  Globe
} from 'lucide-react'
import { toast } from 'sonner'

// Types
interface ProfileData {
  firstName: string
  lastName: string
  email: string
  phone: string
  alternativePhone?: string
  dateOfBirth: string
  nationalId: string
  kraPin?: string
  county: string
  city: string
  physicalAddress?: string
  employerName?: string
  employmentStatus: string
  monthlyIncome?: number
  bankName?: string
  bankAccount?: string
  mpesaPhone?: string
}

interface BankAccount {
  id: string
  bankName: string
  accountNumber: string
  accountType: 'savings' | 'current' | 'fixed'
  isDefault: boolean
}

// Mock data
const mockProfile: ProfileData = {
  firstName: 'John',
  lastName: 'Mwangi',
  email: 'john.mwangi@email.com',
  phone: '0712345678',
  alternativePhone: '',
  dateOfBirth: '1990-05-15',
  nationalId: '12345678',
  kraPin: 'A123456789X',
  county: 'Nairobi',
  city: 'Nairobi',
  physicalAddress: 'Westlands Area, Parklands Road',
  employerName: 'Tech Solutions Ltd',
  employmentStatus: 'Employed',
  monthlyIncome: 85000,
  bankName: 'Equity Bank Kenya',
  bankAccount: '0123456789012',
  mpesaPhone: '0712345678'
}

const mockBankAccounts: BankAccount[] = [
  {
    id: '1',
    bankName: 'Equity Bank Kenya',
    accountNumber: '0123456789012',
    accountType: 'current',
    isDefault: true
  },
  {
    id: '2',
    bankName: 'KCB Bank',
    accountNumber: '9876543210987',
    accountType: 'savings',
    isDefault: false
  }
]

export function CustomerProfile() {
  const [profile, setProfile] = useState<ProfileData>(mockProfile)
  const [bankAccounts] = useState<BankAccount[]>(mockBankAccounts)
  const [isEditing, setIsEditing] = useState(false)
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  
  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  // Handle profile update
  const handleSaveProfile = async () => {
    try {
      const response = await fetch('/api/customer/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile)
      })

      if (!response.ok) throw new Error('Failed to update profile')

      setIsEditing(false)
      toast.success('Profile Updated', {
        description: 'Your changes have been saved successfully.'
      })
    } catch (error) {
      toast.error('Update Failed', {
        description: 'Could not save your changes. Please try again.'
      })
    }
  }

  // Handle password change
  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    if (passwordData.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setShowPasswordForm(false)
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
      
      toast.success('Password Changed', {
        description: 'Your password has been updated successfully.'
      })
    } catch (error) {
      toast.error('Change Failed', {
        description: 'Could not change your password. Please try again.'
      })
    }
  }

  const getInitials = (name: string): string => {
    return `${profile.firstName[0]}${profile.lastName[0]}`.toUpperCase()
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">My Profile</h2>
          <p className="text-muted-foreground mt-1">
            Manage your personal information and settings
          </p>
        </div>

        {!isEditing ? (
          <Button onClick={() => setIsEditing(true)} className="gap-2">
            <Edit3 className="w-4 h-4" />
            Edit Profile
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveProfile} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
              <Save className="w-4 h-4" />
              Save Changes
            </Button>
          </div>
        )}
      </div>

      {/* Profile Header Card */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-8 text-white">
          <div className="flex flex-col md:flex-row items-center gap-6">
            {/* Avatar */}
            <div className="relative group">
              <Avatar className="w-24 h-24 border-4 border-white/20">
                <AvatarFallback className="text-2xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white">
                  {getInitials(profile.firstName + ' ' + profile.lastName)}
                </AvatarFallback>
              </Avatar>
              
              {isEditing && (
                <button className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="w-6 h-6" />
                </button>
              )}
            </div>

            {/* Info */}
            <div className="text-center md:text-left flex-1">
              <h3 className="text-2xl font-bold">
                {profile.firstName} {profile.lastName}
              </h3>
              <p className="text-slate-300 mt-1">{profile.email}</p>
              <div className="flex flex-wrap justify-center md:justify-start gap-2 mt-3">
                <Badge variant="secondary" className="bg-white/10 text-white border-0">
                  Verified Account ✓
                </Badge>
                <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-300 border-0">
                  Credit Score: 720
                </Badge>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-6 text-center">
              <div>
                <p className="text-2xl font-bold">5</p>
                <p className="text-xs text-slate-400">Loans Taken</p>
              </div>
              <div>
                <p className="text-2xl font-bold">100%</p>
                <p className="text-xs text-slate-400">On-Time Pay</p>
              </div>
              <div>
                <p className="text-2xl font-bold">1yr</p>
                <p className="text-xs text-slate-400">Member</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Profile Sections */}
      <Tabs defaultValue="personal" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 max-w-2xl mx-auto">
          <TabsTrigger value="personal" className="gap-2">
            <User className="w-4 h-4" />
            Personal
          </TabsTrigger>
          <TabsTrigger value="contact" className="gap-2">
            <Phone className="w-4 h-4" />
            Contact
          </TabsTrigger>
          <TabsTrigger value="financial" className="gap-2">
            <CreditCard className="w-4 h-4" />
            Financial
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="w-4 h-4" />
            Security
          </TabsTrigger>
        </TabsList>

        {/* Personal Information Tab */}
        <TabsContent value="personal">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Basic details about you</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={profile.firstName}
                    onChange={(e) => setProfile(p => ({ ...p, firstName: e.target.value }))}
                    disabled={!isEditing}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={profile.lastName}
                    onChange={(e) => setProfile(p => ({ ...p, lastName: e.target.value }))}
                    disabled={!isEditing}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dob">Date of Birth</Label>
                  <Input
                    id="dob"
                    type="date"
                    value={profile.dateOfBirth}
                    onChange={(e) => setProfile(p => ({ ...p, dateOfBirth: e.target.value }))}
                    disabled={!isEditing}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nationalId">National ID Number</Label>
                  <Input
                    id="nationalId"
                    value={profile.nationalId}
                    onChange={(e) => setProfile(p => ({ ...p, nationalId: e.target.value }))}
                    disabled={!isEditing}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="kraPin">KRA PIN</Label>
                  <Input
                    id="kraPin"
                    value={profile.kraPin || ''}
                    onChange={(e) => setProfile(p => ({ ...p, kraPin: e.target.value }))}
                    disabled={!isEditing}
                    placeholder="Optional"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="employment">Employment Status</Label>
                  <select
                    id="employment"
                    value={profile.employmentStatus}
                    onChange={(e) => setProfile(p => ({ ...p, employmentStatus: e.target.value }))}
                    disabled={!isEditing}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="Employed">Employed</option>
                    <option value="Self-Employed">Self-Employed</option>
                    <option value="Business Owner">Business Owner</option>
                    <option value="Contractor">Contractor</option>
                    <option value="Student">Student</option>
                    <option value="Retired">Retired</option>
                  </select>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="employer">Employer / Business Name</Label>
                  <Input
                    id="employer"
                    value={profile.employerName || ''}
                    onChange={(e) => setProfile(p => ({ ...p, employerName: e.target.value }))}
                    disabled={!isEditing}
                    placeholder="Where do you work?"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="income">Monthly Income (KSh)</Label>
                  <Input
                    id="income"
                    type="number"
                    value={profile.monthlyIncome || ''}
                    onChange={(e) => setProfile(p => ({ ...p, monthlyIncome: Number(e.target.value) }))}
                    disabled={!isEditing}
                    placeholder="Your monthly income"
                  />
                </div>
              </div>

              {/* Address Section */}
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Address Information
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="county">County</Label>
                    <Input
                      id="county"
                      value={profile.county}
                      onChange={(e) => setProfile(p => ({ ...p, county: e.target.value }))}
                      disabled={!isEditing}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="city">City/Town</Label>
                    <Input
                      id="city"
                      value={profile.city}
                      onChange={(e) => setProfile(p => ({ ...p, city: e.target.value }))}
                      disabled={!isEditing}
                    />
                  </div>
                  
                  <div className="space-y-2 md:col-span-1">
                    <Label htmlFor="address">Physical Address</Label>
                    <Input
                      id="address"
                      value={profile.physicalAddress || ''}
                      onChange={(e) => setProfile(p => ({ ...p, physicalAddress: e.target.value }))}
                      disabled={!isEditing}
                      placeholder="Street address, estate, etc."
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contact Information Tab */}
        <TabsContent value="contact">
          <Card>
            <CardHeader>
              <CardTitle>Contact Details</CardTitle>
              <CardDescription>How we can reach you</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile(p => ({ ...p, email: e.target.value }))}
                    disabled={!isEditing}
                  />
                  <p className="text-xs text-muted-foreground">
                    Used for statements and important updates
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4" />
                    Primary Phone
                  </Label>
                  <div className="flex gap-2">
                    <span className="flex items-center px-3 py-2 bg-muted rounded-md text-sm font-medium border">
                      +254
                    </span>
                    <Input
                      id="phone"
                      value={profile.phone}
                      onChange={(e) => setProfile(p => ({ ...p, phone: e.target.value }))}
                      disabled={!isEditing}
                      placeholder="7XX XXX XXX"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Your main contact number for SMS alerts
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="altPhone" className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Alternative Phone
                  </Label>
                  <div className="flex gap-2">
                    <span className="flex items-center px-3 py-2 bg-muted rounded-md text-sm font-medium border">
                      +254
                    </span>
                    <Input
                      id="altPhone"
                      value={profile.alternativePhone || ''}
                      onChange={(e) => setProfile(p => ({ ...p, alternativePhone: e.target.value }))}
                      disabled={!isEditing}
                      placeholder="Optional backup number"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mpesa" className="flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    M-Pesa Number
                  </Label>
                  <div className="flex gap-2">
                    <span className="flex items-center px-3 py-2 bg-muted rounded-md text-sm font-medium border">
                      +254
                    </span>
                    <Input
                      id="mpesa"
                      value={profile.mpesaPhone || ''}
                      onChange={(e) => setProfile(p => ({ ...p, mpesaPhone: e.target.value }))}
                      disabled={!isEditing}
                      placeholder="For loan disbursements"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Where to receive loan funds via M-Pesa
                  </p>
                </div>
              </div>

              {/* Notification Preferences Preview */}
              <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-blue-600" />
                  Notification Settings
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" defaultChecked className="rounded" />
                    SMS Alerts
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" defaultChecked className="rounded" />
                    Email Updates
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="rounded" />
                    WhatsApp
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" defaultChecked className="rounded" />
                    Push Notifications
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Financial Information Tab */}
        <TabsContent value="financial">
          <div className="space-y-6">
            {/* Bank Accounts */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="w-5 h-5" />
                      Bank Accounts
                    </CardTitle>
                    <CardDescription>Linked accounts for payments and disbursements</CardDescription>
                  </div>
                  {isEditing && (
                    <Button variant="outline" size="sm" className="gap-1">
                      Add Account
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {bankAccounts.map((account) => (
                  <div 
                    key={account.id}
                    className={`flex items-center justify-between p-4 rounded-lg border ${
                      account.isDefault 
                        ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20' 
                        : ''
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-slate-600" />
                      </div>
                      <div>
                        <p className="font-medium">{account.bankName}</p>
                        <p className="text-sm text-muted-foreground">
                          ****{account.accountNumber.slice(-4)} • {account.accountType}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {account.isDefault && (
                        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400">
                          Default
                        </Badge>
                      )}
                      {isEditing && (
                        <Button variant="ghost" size="sm">
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                ))}

                {!isEditing && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    To add or remove bank accounts, click "Edit Profile" above
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Income Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Income Summary</CardTitle>
                <CardDescription>Your declared income information</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg text-center">
                    <p className="text-sm text-muted-foreground">Monthly Income</p>
                    <p className="text-xl font-bold mt-1">
                      KSh {(profile.monthlyIncome || 0).toLocaleString()}
                    </p>
                  </div>
                  
                  <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg text-center">
                    <p className="text-sm text-muted-foreground">Employment Status</p>
                    <p className="text-xl font-semibold mt-1 capitalize">
                      {profile.employmentStatus}
                    </p>
                  </div>
                  
                  <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg text-center">
                    <p className="text-sm text-muted-foreground">Employer</p>
                    <p className="text-lg font-semibold mt-1 truncate">
                      {profile.employerName || 'Not specified'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <div className="space-y-6">
            {/* Password Change */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="w-5 h-5" />
                  Password & Security
                </CardTitle>
                <CardDescription>Keep your account secure</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {!showPasswordForm ? (
                  <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Key className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Password</p>
                        <p className="text-sm text-muted-foreground">
                          Last changed 30 days ago
                        </p>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={() => setShowPasswordForm(true)}
                    >
                      Change Password
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4 p-4 border rounded-lg">
                    <div className="space-y-2">
                      <Label htmlFor="currentPass">Current Password</Label>
                      <div className="relative">
                        <Input
                          id="currentPass"
                          type={showCurrentPassword ? 'text' : 'password'}
                          value={passwordData.currentPassword}
                          onChange={(e) => setPasswordData(d => ({ ...d, currentPassword: e.target.value }))}
                          placeholder="Enter current password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="newPass">New Password</Label>
                      <div className="relative">
                        <Input
                          id="newPass"
                          type={showNewPassword ? 'text' : 'password'}
                          value={passwordData.newPassword}
                          onChange={(e) => setPasswordData(d => ({ ...d, newPassword: e.target.value }))}
                          placeholder="Enter new password (min 8 chars)"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPass">Confirm New Password</Label>
                      <Input
                        id="confirmPass"
                        type="password"
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData(d => ({ ...d, confirmPassword: e.target.value }))}
                        placeholder="Re-enter new password"
                      />
                    </div>

                    {/* Password Requirements */}
                    <div className="text-xs space-y-1 text-muted-foreground">
                      <p>Password must:</p>
                      <ul className="list-disc list-inside ml-2 space-y-0.5">
                        <li className={passwordData.newPassword.length >= 8 ? 'text-emerald-600' : ''}>
                          Be at least 8 characters long
                        </li>
                        <li className={/[A-Z]/.test(passwordData.newPassword) ? 'text-emerald-600' : ''}>
                          Contain an uppercase letter
                        </li>
                        <li className={/[a-z]/.test(passwordData.newPassword) ? 'text-emerald-600' : ''}>
                          Contain a lowercase letter
                        </li>
                        <li className={/[0-9]/.test(passwordData.newPassword) ? 'text-emerald-600' : ''}>
                          Contain a number
                        </li>
                      </ul>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setShowPasswordForm(false)
                          setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
                        }}
                      >
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleChangePassword}
                        disabled={
                          !passwordData.currentPassword || 
                          !passwordData.newPassword || 
                          passwordData.newPassword !== passwordData.confirmPassword ||
                          passwordData.newPassword.length < 8
                        }
                        className="gap-2"
                      >
                        <Lock className="w-4 h-4" />
                        Update Password
                      </Button>
                    </div>
                  </div>
                )}

                <Separator />

                {/* Two-Factor Authentication */}
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-emerald-600" />
                    <div>
                      <p className="font-medium">Two-Factor Authentication</p>
                      <p className="text-sm text-muted-foreground">
                        Add an extra layer of security to your account
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    Enable
                  </Button>
                </div>

                {/* Active Sessions */}
                <div className="space-y-3">
                  <h4 className="font-medium">Active Sessions</h4>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      <div>
                        <p className="font-medium text-sm">Current Session</p>
                        <p className="text-xs text-muted-foreground">
                          Chrome on Windows • Nairobi, Kenya • Now
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary">Active</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="border-red-200 bg-red-50/30 dark:border-red-800 dark:bg-red-950/20">
              <CardHeader>
                <CardTitle className="text-red-700 dark:text-red-400">Danger Zone</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Delete Account</p>
                    <p className="text-sm text-muted-foreground">
                      Permanently delete your account and all associated data
                    </p>
                  </div>
                  <Button variant="destructive" size="sm">
                    Delete Account
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default CustomerProfile
