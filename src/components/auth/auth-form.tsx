
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Chrome, Facebook } from 'lucide-react';

export function AuthForm() {
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerName, setRegisterName] = useState(''); // This will be used for name and initial displayName
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authAction, setAuthAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { login, register, signInWithGoogle, signInWithFacebook } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/profile'; // Redirect to profile after registration

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setAuthAction('email');
    setError(null);
    try {
      await login(loginEmail, loginPassword);
      toast({ title: "Login Successful", description: "Welcome back!" });
      router.push(searchParams.get('redirect') || '/'); // Use original redirect for login
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
    setIsSubmitting(true);
    setAuthAction('email');
    setError(null);
    try {
      // Pass registerName to be used as both 'name' and initial 'displayName'
      await register(registerEmail, registerPassword, registerName);
      toast({ title: "Registration Successful", description: "Welcome to GuernseySpeaks! Please set up your profile." });
      router.push(redirectPath); // Redirect to profile page
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


  return (
    <div className="flex items-center justify-center py-12">
      <Tabs defaultValue="login" className="w-full max-w-md">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="login">Login</TabsTrigger>
          <TabsTrigger value="register">Register</TabsTrigger>
        </TabsList>
        <TabsContent value="login">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl">Login</CardTitle>
              <CardDescription>Enter your email below to login to your account.</CardDescription>
            </CardHeader>
            <form onSubmit={handleLogin}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input id="login-email" type="email" placeholder="m@example.com" required value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <Input id="login-password" type="password" required value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
              </CardContent>
              <CardFooter className="flex flex-col gap-4">
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting && authAction === 'email' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Login
                </Button>
                <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={isSubmitting}>
                  {isSubmitting && authAction === 'google' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Chrome className="mr-2 h-4 w-4" />}
                  Sign in with Google
                </Button>
                <Button variant="outline" className="w-full bg-[#1877F2] text-white hover:bg-[#1877F2]/90" onClick={handleFacebookSignIn} disabled={isSubmitting}>
                  {isSubmitting && authAction === 'facebook' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Facebook className="mr-2 h-4 w-4" />}
                  Sign in with Facebook
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>
        <TabsContent value="register">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl">Register</CardTitle>
              <CardDescription>Create an account to join the community. Your full name will be your initial display name.</CardDescription>
            </CardHeader>
            <form onSubmit={handleRegister}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="register-name">Full Name</Label>
                  <Input id="register-name" placeholder="John Doe" required value={registerName} onChange={(e) => setRegisterName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-email">Email</Label>
                  <Input id="register-email" type="email" placeholder="m@example.com" required value={registerEmail} onChange={(e) => setRegisterEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-password">Password</Label>
                  <Input id="register-password" type="password" required value={registerPassword} onChange={(e) => setRegisterPassword(e.target.value)} />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
              </CardContent>
              <CardFooter className="flex flex-col gap-4">
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting && authAction === 'email' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Register
                </Button>
                 <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={isSubmitting}>
                  {isSubmitting && authAction === 'google' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Chrome className="mr-2 h-4 w-4" />}
                  Sign up with Google
                </Button>
                <Button variant="outline" className="w-full bg-[#1877F2] text-white hover:bg-[#1877F2]/90" onClick={handleFacebookSignIn} disabled={isSubmitting}>
                  {isSubmitting && authAction === 'facebook' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Facebook className="mr-2 h-4 w-4" />}
                  Sign up with Facebook
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
