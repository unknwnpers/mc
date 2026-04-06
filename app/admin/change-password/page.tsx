'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Eye, EyeOff, Lock, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PasswordPolicy {
  minLength: number;
  maxLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  specialChars: string;
  maxAgeDays: number;
  preventReuseCount: number;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  strength: number;
  strengthLabel: 'Weak' | 'Fair' | 'Good' | 'Strong';
}

export default function ChangePasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const isExpired = searchParams.get('expired') === 'true';
  const redirectTo = searchParams.get('redirect') || '/admin';
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [policy, setPolicy] = useState<PasswordPolicy | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [passwordsMatch, setPasswordsMatch] = useState(true);
  
  // Fetch password policy on mount
  useEffect(() => {
    fetchPolicy();
  }, []);
  
  // Validate password as user types
  useEffect(() => {
    if (newPassword && policy) {
      validatePassword(newPassword);
    } else {
      setValidation(null);
    }
  }, [newPassword, policy]);
  
  // Check if passwords match
  useEffect(() => {
    if (confirmPassword) {
      setPasswordsMatch(newPassword === confirmPassword);
    } else {
      setPasswordsMatch(true);
    }
  }, [newPassword, confirmPassword]);
  
  const fetchPolicy = async () => {
    try {
      const response = await fetch('/api/admin/security/password-policy');
      if (response.ok) {
        const data = await response.json();
        setPolicy(data.policy);
      }
    } catch (error) {
      console.error('Failed to fetch password policy:', error);
    }
  };
  
  const validatePassword = async (password: string) => {
    try {
      const response = await fetch('/api/admin/security/password-policy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'validate', password }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setValidation(data.result);
      }
    } catch (error) {
      console.error('Failed to validate password:', error);
    }
  };
  
  const getStrengthColor = (strength: number) => {
    if (strength < 40) return 'bg-red-500';
    if (strength < 60) return 'bg-yellow-500';
    if (strength < 80) return 'bg-blue-500';
    return 'bg-green-500';
  };
  
  const getStrengthTextColor = (strength: number) => {
    if (strength < 40) return 'text-red-500';
    if (strength < 60) return 'text-yellow-500';
    if (strength < 80) return 'text-blue-500';
    return 'text-green-500';
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validation?.valid) {
      toast({
        title: 'Invalid Password',
        description: 'Please fix the password requirements before submitting.',
        variant: 'destructive',
      });
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast({
        title: 'Passwords Do Not Match',
        description: 'Please ensure both passwords match.',
        variant: 'destructive',
      });
      return;
    }
    
    if (!isExpired && !currentPassword) {
      toast({
        title: 'Current Password Required',
        description: 'Please enter your current password.',
        variant: 'destructive',
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/admin/security/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: isExpired ? undefined : currentPassword,
          newPassword,
          isExpiredChange: isExpired,
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        toast({
          title: 'Password Changed Successfully',
          description: `Your new password strength is ${data.strengthLabel}. ${data.daysUntilExpiration ? `Expires in ${data.daysUntilExpiration} days.` : ''}`,
        });
        
        // Redirect after successful change
        setTimeout(() => {
          router.push(redirectTo);
        }, 1500);
      } else {
        toast({
          title: 'Failed to Change Password',
          description: data.error || 'An error occurred. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to change password. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const requirements = [
    { label: `At least ${policy?.minLength || 12} characters`, check: newPassword.length >= (policy?.minLength || 12) },
    { label: 'At least one uppercase letter (A-Z)', check: /[A-Z]/.test(newPassword) },
    { label: 'At least one lowercase letter (a-z)', check: /[a-z]/.test(newPassword) },
    { label: 'At least one number (0-9)', check: /[0-9]/.test(newPassword) },
    { label: 'At least one special character', check: /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(newPassword) },
  ];
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <Lock className="h-6 w-6 text-primary" />
            <CardTitle className="text-2xl">Change Password</CardTitle>
          </div>
          <CardDescription>
            {isExpired 
              ? 'Your password has expired. Please create a new password to continue.'
              : 'Update your password to keep your account secure.'}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {isExpired && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Your password has expired. You must change it before accessing the admin panel.
              </AlertDescription>
            </Alert>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isExpired && (
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter your current password"
                    required={!isExpired}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter your new password"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              
              {newPassword && validation && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Strength:</span>
                    <span className={getStrengthTextColor(validation.strength)}>
                      {validation.strengthLabel}
                    </span>
                  </div>
                  <Progress 
                    value={validation.strength} 
                    className="h-2"
                  />
                  <div 
                    className="h-2 rounded-full -mt-4"
                    style={{ 
                      width: `${validation.strength}%`,
                      backgroundColor: validation.strength < 40 ? '#ef4444' : 
                                      validation.strength < 60 ? '#eab308' : 
                                      validation.strength < 80 ? '#3b82f6' : '#22c55e'
                    }}
                  />
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your new password"
                  required
                  className={!passwordsMatch && confirmPassword ? 'border-red-500' : ''}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {!passwordsMatch && confirmPassword && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <XCircle className="h-3 w-3" />
                  Passwords do not match
                </p>
              )}
              {passwordsMatch && confirmPassword && newPassword === confirmPassword && (
                <p className="text-sm text-green-500 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Passwords match
                </p>
              )}
            </div>
            
            {newPassword && (
              <div className="space-y-2 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium">Password Requirements:</p>
                <div className="space-y-1">
                  {requirements.map((req, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      {req.check ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-gray-300" />
                      )}
                      <span className={req.check ? 'text-green-700' : 'text-gray-500'}>
                        {req.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => router.back()}
                disabled={isLoading || isExpired}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={
                  isLoading || 
                  !validation?.valid || 
                  !passwordsMatch || 
                  (!isExpired && !currentPassword)
                }
              >
                {isLoading ? 'Changing...' : 'Change Password'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
