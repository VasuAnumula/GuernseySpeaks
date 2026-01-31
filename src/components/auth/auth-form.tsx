
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Chrome, Facebook, Eye, EyeOff, Sparkles, Mail } from 'lucide-react';
import Link from 'next/link';
import { PasswordStrength } from './password-strength';

export function AuthForm() {
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerDisplayName, setRegisterDisplayName] = useState('');
  const [registerName, setRegisterName] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authAction, setAuthAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resetEmail, setResetEmail] = useState('');
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);

  const { login, register, signInWithGoogle, signInWithFacebook, resetPassword } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/profile';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setAuthAction('email');
    setError(null);
    try {
      await login(loginEmail, loginPassword);
      toast({ title: "Login Successful", description: "Welcome back!" });
      router.push(searchParams.get('redirect') || '/');
    } catch (err: any) {
      setError(err.message || "Failed to login. Please check your credentials.");
      toast({ title: "Login Failed", description: err.message || "Please check your credentials.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
      setAuthAction(null);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptedTerms) {
      setError('You must accept the terms and conditions to register.');
      return;
    }
    setIsSubmitting(true);
    setAuthAction('email');
    setError(null);
    try {
      await register(registerEmail, registerPassword, registerDisplayName, registerName || null);
      toast({ title: "Registration Successful", description: "Welcome to GuernseySpeaks! Please set up your profile." });
      router.push(redirectPath);
    } catch (err: any) {
      setError(err.message || "Failed to register. Please try again.");
      toast({ title: "Registration Failed", description: err.message || "Please try again.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
      setAuthAction(null);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    setAuthAction('google');
    setError(null);
    try {
      await signInWithGoogle();
      toast({ title: "Sign-in Successful", description: "Welcome!" });
      router.push(redirectPath);
    } catch (err: any) {
      setError(err.message || "Failed to sign in with Google.");
      toast({ title: "Google Sign-in Failed", description: err.message || "Please try again.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
      setAuthAction(null);
    }
  };

  const handleFacebookSignIn = async () => {
    setIsSubmitting(true);
    setAuthAction('facebook');
    setError(null);
    try {
      await signInWithFacebook();
      toast({ title: "Sign-in Successful", description: "Welcome!" });
      router.push(redirectPath);
    } catch (err: any) {
      setError(err.message || "Failed to sign in with Facebook. Ensure it's configured in Firebase.");
      toast({ title: "Facebook Sign-in Failed", description: err.message || "Please try again.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
      setAuthAction(null);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      setResetError('Please enter your email address.');
      return;
    }
    setIsResettingPassword(true);
    setResetError(null);
    setResetSuccess(false);
    try {
      await resetPassword(resetEmail);
      setResetSuccess(true);
      toast({ title: "Email Sent", description: "Check your inbox for password reset instructions." });
    } catch (err: any) {
      setResetError(err.message || "Failed to send reset email. Please try again.");
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleResetDialogClose = () => {
    setIsResetDialogOpen(false);
    setResetEmail('');
    setResetError(null);
    setResetSuccess(false);
  };


  return (
    <div className="flex items-center justify-center py-12 px-4 animate-fade-in-up">
      <Tabs defaultValue="login" className="w-full max-w-md">
        <TabsList className="grid w-full grid-cols-2 mb-6 p-1 bg-muted/50 backdrop-blur-sm">
          <TabsTrigger
            value="login"
            className="data-[state=active]:bg-background data-[state=active]:shadow-md transition-all duration-300"
          >
            Login
          </TabsTrigger>
          <TabsTrigger
            value="register"
            className="data-[state=active]:bg-background data-[state=active]:shadow-md transition-all duration-300"
          >
            Register
          </TabsTrigger>
        </TabsList>

        <TabsContent value="login" className="mt-0">
          <Card className="glass-card border-2 shadow-2xl animate-scale-in-smooth">
            <CardHeader className="space-y-3 pb-6">
              <div className="flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-primary animate-pulse" />
                <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Welcome Back
                </CardTitle>
              </div>
              <CardDescription className="text-base">
                Enter your credentials to access your account
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleLogin}>
              <CardContent className="space-y-5">
                <div className="space-y-2 animate-fade-in-up stagger-1">
                  <Label htmlFor="login-email" className="text-sm font-medium">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="m@example.com"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="input-glow h-11 transition-all duration-300 hover:border-primary/50"
                  />
                </div>
                <div className="space-y-2 animate-fade-in-up stagger-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="login-password" className="text-sm font-medium">Password</Label>
                    <Dialog open={isResetDialogOpen} onOpenChange={(open) => open ? setIsResetDialogOpen(true) : handleResetDialogClose()}>
                      <DialogTrigger asChild>
                        <button type="button" className="text-xs text-primary hover:underline hover:text-primary/80 transition-colors">
                          Forgot password?
                        </button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2">
                            <Mail className="h-5 w-5 text-primary" />
                            Reset Password
                          </DialogTitle>
                          <DialogDescription>
                            Enter your email address and we'll send you a link to reset your password.
                          </DialogDescription>
                        </DialogHeader>
                        {resetSuccess ? (
                          <div className="py-4">
                            <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4 text-center">
                              <p className="text-green-700 dark:text-green-300 font-medium">Email Sent!</p>
                              <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                                Check your inbox for password reset instructions.
                              </p>
                            </div>
                            <Button
                              onClick={handleResetDialogClose}
                              className="w-full mt-4"
                            >
                              Done
                            </Button>
                          </div>
                        ) : (
                          <form onSubmit={handlePasswordReset}>
                            <div className="space-y-4 py-4">
                              <div className="space-y-2">
                                <Label htmlFor="reset-email">Email</Label>
                                <Input
                                  id="reset-email"
                                  type="email"
                                  placeholder="m@example.com"
                                  value={resetEmail}
                                  onChange={(e) => setResetEmail(e.target.value)}
                                  disabled={isResettingPassword}
                                  className="h-11"
                                />
                              </div>
                              {resetError && (
                                <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-md border border-destructive/20">
                                  {resetError}
                                </p>
                              )}
                            </div>
                            <DialogFooter>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={handleResetDialogClose}
                                disabled={isResettingPassword}
                              >
                                Cancel
                              </Button>
                              <Button type="submit" disabled={isResettingPassword}>
                                {isResettingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Send Reset Link
                              </Button>
                            </DialogFooter>
                          </form>
                        )}
                      </DialogContent>
                    </Dialog>
                  </div>
                  <div className="relative">
                    <Input
                      id="login-password"
                      type={showLoginPassword ? "text" : "password"}
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="input-glow h-11 pr-10 transition-all duration-300 hover:border-primary/50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-all duration-200 hover:scale-110"
                    >
                      {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center space-x-2 animate-fade-in-up stagger-3">
                  <Checkbox
                    id="remember-me"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(!!checked)}
                    className="transition-all duration-200"
                  />
                  <Label htmlFor="remember-me" className="text-sm font-normal cursor-pointer">
                    Remember me
                  </Label>
                </div>
                {error && (
                  <div className="animate-in fade-in slide-in-from-top-1 duration-300">
                    <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-md border border-destructive/20">{error}</p>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex flex-col gap-4 pt-2">
                <Button
                  type="submit"
                  className="w-full h-11 gradient-primary hover:gradient-primary-hover button-hover-lift text-white font-medium shadow-lg"
                  disabled={isSubmitting}
                >
                  {isSubmitting && authAction === 'email' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isSubmitting && authAction === 'email' ? 'Logging in...' : 'Login'}
                </Button>

                <div className="relative w-full">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-muted-foreground/20" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-3 text-muted-foreground font-medium">Or continue with</span>
                  </div>
                </div>

                {/* Google Sign-In Button - Official Brand Guidelines */}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-11 bg-white hover:bg-gray-50 text-gray-700 border-2 border-gray-300 hover:border-gray-400 font-medium shadow-sm transition-all duration-200"
                  onClick={handleGoogleSignIn}
                  disabled={isSubmitting}
                >
                  {isSubmitting && authAction === 'google' ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                  )}
                  <span className="text-sm font-medium">Sign in with Google</span>
                </Button>

                {/* Facebook Login Button - Official Brand Guidelines */}
                <Button
                  type="button"
                  className="w-full h-11 bg-[#1877F2] hover:bg-[#1664D8] text-white border-0 font-medium shadow-sm transition-all duration-200"
                  onClick={handleFacebookSignIn}
                  disabled={isSubmitting}
                >
                  {isSubmitting && authAction === 'facebook' ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <Facebook className="mr-3 h-5 w-5 fill-white" />
                  )}
                  <span className="text-sm font-medium">Continue with Facebook</span>
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        <TabsContent value="register" className="mt-0">
          <Card className="glass-card border-2 shadow-2xl animate-scale-in-smooth">
            <CardHeader className="space-y-3 pb-6">
              <div className="flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-primary animate-pulse" />
                <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Join Us
                </CardTitle>
              </div>
              <CardDescription className="text-base">
                Create an account to join the Guernsey community
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleRegister}>
              <CardContent className="space-y-5">
                <div className="space-y-2 animate-fade-in-up stagger-1">
                  <Label htmlFor="register-display-name" className="text-sm font-medium">Display Name</Label>
                  <Input
                    id="register-display-name"
                    placeholder="cooluser123"
                    required
                    value={registerDisplayName}
                    onChange={(e) => setRegisterDisplayName(e.target.value)}
                    className="input-glow h-11 transition-all duration-300 hover:border-primary/50"
                  />
                  <p className="text-xs text-muted-foreground">This is how others will see you</p>
                </div>

                <div className="space-y-2 animate-fade-in-up stagger-2">
                  <Label htmlFor="register-email" className="text-sm font-medium">Email</Label>
                  <Input
                    id="register-email"
                    type="email"
                    placeholder="m@example.com"
                    required
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    className="input-glow h-11 transition-all duration-300 hover:border-primary/50"
                  />
                </div>

                <div className="space-y-2 animate-fade-in-up stagger-3">
                  <Label htmlFor="register-password" className="text-sm font-medium">Password</Label>
                  <div className="relative">
                    <Input
                      id="register-password"
                      type={showRegisterPassword ? "text" : "password"}
                      required
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                      className="input-glow h-11 pr-10 transition-all duration-300 hover:border-primary/50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-all duration-200 hover:scale-110"
                    >
                      {showRegisterPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <PasswordStrength password={registerPassword} />
                </div>

                <div className="space-y-2 animate-fade-in-up stagger-4">
                  <Label htmlFor="register-name" className="text-sm font-normal">
                    Full Name <span className="text-muted-foreground">(optional)</span>
                  </Label>
                  <Input
                    id="register-name"
                    placeholder="John Doe"
                    value={registerName}
                    onChange={(e) => setRegisterName(e.target.value)}
                    className="input-glow h-11 transition-all duration-300 hover:border-primary/50"
                  />
                </div>

                <div className="flex items-center space-x-2 animate-fade-in-up stagger-4">
                  <Checkbox
                    id="accept-terms"
                    checked={acceptedTerms}
                    onCheckedChange={(checked) => setAcceptedTerms(!!checked)}
                    className="transition-all duration-200"
                  />
                  <Label htmlFor="accept-terms" className="text-sm font-normal cursor-pointer">
                    I agree to the{' '}
                    <Link href="/terms" className="underline hover:text-primary transition-colors">Terms & Conditions</Link>
                  </Label>
                </div>

                {error && (
                  <div className="animate-in fade-in slide-in-from-top-1 duration-300">
                    <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-md border border-destructive/20">{error}</p>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex flex-col gap-4 pt-2">
                <Button
                  type="submit"
                  className="w-full h-11 gradient-primary hover:gradient-primary-hover button-hover-lift text-white font-medium shadow-lg"
                  disabled={isSubmitting}
                >
                  {isSubmitting && authAction === 'email' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isSubmitting && authAction === 'email' ? 'Creating account...' : 'Create Account'}
                </Button>

                <div className="relative w-full">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-muted-foreground/20" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-3 text-muted-foreground font-medium">Or continue with</span>
                  </div>
                </div>

                {/* Google Sign-In Button - Official Brand Guidelines */}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-11 bg-white hover:bg-gray-50 text-gray-700 border-2 border-gray-300 hover:border-gray-400 font-medium shadow-sm transition-all duration-200"
                  onClick={handleGoogleSignIn}
                  disabled={isSubmitting}
                >
                  {isSubmitting && authAction === 'google' ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                  )}
                  <span className="text-sm font-medium">Sign up with Google</span>
                </Button>

                {/* Facebook Login Button - Official Brand Guidelines */}
                <Button
                  type="button"
                  className="w-full h-11 bg-[#1877F2] hover:bg-[#1664D8] text-white border-0 font-medium shadow-sm transition-all duration-200"
                  onClick={handleFacebookSignIn}
                  disabled={isSubmitting}
                >
                  {isSubmitting && authAction === 'facebook' ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <Facebook className="mr-3 h-5 w-5 fill-white" />
                  )}
                  <span className="text-sm font-medium">Continue with Facebook</span>
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
