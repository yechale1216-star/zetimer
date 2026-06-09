'use client'

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getApiUrl } from '@/lib/auth/auth'

interface AddSchoolDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function AddSchoolDialog({ open, onOpenChange, onSuccess }: AddSchoolDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    adminName: '',
    adminEmail: '',
    adminPhone: '',
    tier: 'free',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successData, setSuccessData] = useState<{ email: string; password?: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccessData(null)

    try {
      const response = await fetch(`${getApiUrl()}/api/schools`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('attendance_token')}`
        },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Failed to create school');
      }

      setSuccessData({
        email: result.data.adminUser.email,
        password: result.data.adminUser.generatedPassword
      });
      
      if (onSuccess) onSuccess();
      
      // Optionally reset form but keep success data visible
      setFormData({
        name: '',
        adminName: '',
        adminEmail: '',
        adminPhone: '',
        tier: 'free',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  if (successData) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-green-600">School Created Successfully!</DialogTitle>
            <DialogDescription>
              The school and administrator account have been initialized. Please share these credentials with the school admin.
            </DialogDescription>
          </DialogHeader>
          
          <div className="p-4 bg-muted rounded-lg space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Admin Email</Label>
              <div className="font-mono text-sm">{successData.email}</div>
            </div>
            {successData.password && (
              <div>
                <Label className="text-xs text-muted-foreground">Generated Password</Label>
                <div className="font-mono text-sm font-bold text-primary">{successData.password}</div>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-2 italic">
              Note: The admin will be prompted to complete the setup wizard upon their first login.
            </p>
          </div>

          <DialogFooter>
            <Button onClick={() => { setSuccessData(null); onOpenChange(false); }}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Add New School</DialogTitle>
          <DialogDescription>Create a new school account and initialize their admin user.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-md">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <h3 className="text-sm font-medium border-b pb-1 text-muted-foreground">School Details</h3>
            <div className="space-y-2">
              <Label htmlFor="name">School Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Springfield High School"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tier">Subscription Tier *</Label>
              <Select 
                value={formData.tier} 
                onValueChange={(value) => setFormData({ ...formData, tier: value })}
                disabled={loading}
              >
                <SelectTrigger id="tier">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free Trial (14 days)</SelectItem>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <h3 className="text-sm font-medium border-b pb-1 text-muted-foreground">Administrator Details</h3>
            <div className="space-y-2">
              <Label htmlFor="adminName">Admin Full Name *</Label>
              <Input
                id="adminName"
                placeholder="e.g., John Doe"
                value={formData.adminName}
                onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="adminEmail">Contact Email *</Label>
              <Input
                id="adminEmail"
                type="email"
                placeholder="admin@school.com"
                value={formData.adminEmail}
                onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="adminPhone">Phone Number</Label>
              <Input
                id="adminPhone"
                placeholder="+251..."
                value={formData.adminPhone}
                onChange={(e) => setFormData({ ...formData, adminPhone: e.target.value })}
                disabled={loading}
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Initialize School"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
