
"use client";

import { MainLayout } from '@/components/layout/main-layout';
import { WeatherWidget } from '@/components/weather-widget';
import { AdPlaceholder } from '@/components/ad-placeholder';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Users, ShieldAlert, ListChecks, Loader2, User as UserIconLucide } from 'lucide-react';
import { getUsers, setUserRole } from '@/services/userService';
import type { User } from '@/types';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [platformUsers, setPlatformUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || (user.role !== 'superuser' && user.role !== 'moderator'))) {
      router.push('/'); 
    }
  }, [user, authLoading, router]);

  const handleMakeModerator = async (targetUserId: string) => {
    if (!user || user.role !== 'superuser') {
      toast({ title: "Unauthorized", description: "Only superusers can change roles.", variant: "destructive" });
      return;
    }
    if (user.uid === targetUserId) {
      toast({ title: "Action Not Allowed", description: "You cannot change your own role.", variant: "destructive" });
      return;
    }

    setUpdatingRoleId(targetUserId);
    try {
      await setUserRole(targetUserId, 'moderator');
      setPlatformUsers(prevUsers => 
        prevUsers.map(pUser => 
          pUser.uid === targetUserId ? { ...pUser, role: 'moderator' } : pUser
        )
      );
      toast({ title: "Role Updated", description: `User ${targetUserId} is now a moderator.` });
    } catch (error: any) {
      console.error(`Failed to make user ${targetUserId} a moderator:`, error);
      toast({ title: "Error", description: error.message || "Could not update user role.", variant: "destructive" });
    } finally {
      setUpdatingRoleId(null);
    }
  };

  useEffect(() => {
    if (user && (user.role === 'superuser' || user.role === 'moderator')) {
      const fetchUsers = async () => {
        setLoadingUsers(true);
        try {
          const fetchedUsers = await getUsers();
          setPlatformUsers(fetchedUsers);
        } catch (error) {
          console.error("Failed to fetch users:", error);
        } finally {
          setLoadingUsers(false);
        }
      };
      fetchUsers();
    }
  }, [user]);


  if (authLoading || !user || (user.role !== 'superuser' && user.role !== 'moderator')) {
    return (
      <MainLayout weatherWidget={<WeatherWidget />} adsWidget={<AdPlaceholder />}>
        <div className="flex justify-center items-center h-64">
          {authLoading ? (
            <>
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2 text-muted-foreground">Loading...</p>
            </>
          ) : (
            <p className="text-destructive">Access Denied. Admin or Moderator role required.</p>
          )}
        </div>
      </MainLayout>
    );
  }
  
  const userCount = loadingUsers ? <Loader2 className="h-5 w-5 animate-spin" /> : platformUsers.length;
  const moderatorCount = loadingUsers ? <Loader2 className="h-5 w-5 animate-spin" /> : platformUsers.filter(u => u.role === 'moderator').length;
  
  return (
    <MainLayout
      weatherWidget={<WeatherWidget />}
      adsWidget={<AdPlaceholder />}
    >
      <div className="space-y-8">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-3xl">Admin Dashboard</CardTitle>
            <CardDescription>Manage users, moderate content, and oversee the platform.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <Users className="h-5 w-5 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{userCount}</div>
                </CardContent>
              </Card>
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Moderators</CardTitle>
                  <ListChecks className="h-5 w-5 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{moderatorCount}</div>
                </CardContent>
              </Card>
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Reported Content</CardTitle>
                  <ShieldAlert className="h-5 w-5 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">N/A</div>
                  <p className="text-xs text-muted-foreground">Pending reports (Coming Soon)</p>
                  <Button variant="outline" size="sm" className="mt-2 w-full" disabled>Review Reports</Button>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>User Management</CardTitle>
            <CardDescription>View and manage platform users. Only superusers can change roles.</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingUsers ? (
              <div className="flex justify-center items-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-2 text-muted-foreground">Loading users...</p>
              </div>
            ) : platformUsers.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No users found.</p>
            ) : (
              <Table>
                <TableCaption>A list of all registered users on the platform.</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">Avatar</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Joined</TableHead>
                    {user.role === 'superuser' && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {platformUsers.map((pUser) => {
                    const userName = pUser.displayName || pUser.name || 'N/A';
                    const userAvatarFallback = userName ? userName.substring(0, 1).toUpperCase() : <UserIconLucide className="h-4 w-4"/>;
                    let joinedDate = "Invalid Date";
                    if (pUser.createdAt) {
                        try {
                            const date = pUser.createdAt instanceof Date ? pUser.createdAt : (pUser.createdAt as any).toDate();
                            joinedDate = format(date, "MMM d, yyyy");
                        } catch (e) { console.error("Error formatting user joined date", e); }
                    }
                    const isCurrentUserAdmin = user.uid === pUser.uid;
                    const canChangeRole = user.role === 'superuser' && !isCurrentUserAdmin && pUser.role !== 'superuser';

                    return (
                      <TableRow key={pUser.uid}>
                        <TableCell>
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={pUser.avatarUrl || undefined} alt={userName} data-ai-hint="user avatar"/>
                            <AvatarFallback>{userAvatarFallback}</AvatarFallback>
                          </Avatar>
                        </TableCell>
                        <TableCell className="font-medium">{userName}</TableCell>
                        <TableCell>{pUser.email || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={pUser.role === 'superuser' ? 'default' : pUser.role === 'moderator' ? 'secondary' : 'outline'}
                            className="capitalize"
                          >
                            {pUser.role || 'user'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{joinedDate}</TableCell>
                        {user.role === 'superuser' && (
                          <TableCell className="text-right">
                            {pUser.role === 'user' && canChangeRole ? (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handleMakeModerator(pUser.uid)}
                                disabled={updatingRoleId === pUser.uid || !canChangeRole}
                              >
                                {updatingRoleId === pUser.uid && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Make Moderator
                              </Button>
                            ) : pUser.role === 'moderator' && canChangeRole ? (
                              <Button variant="outline" size="sm" disabled className="opacity-70">
                                Is Moderator
                              </Button>
                            ) : pUser.role === 'superuser' ? (
                               <Badge variant="default" className="opacity-70">Superuser</Badge>
                            ) : isCurrentUserAdmin ? (
                                <Badge variant="secondary" className="opacity-70">Your Account</Badge>
                            ) : null}
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
        
        <Card>
            <CardHeader>
              <CardTitle>Platform Settings</CardTitle>
              <CardDescription>Configure global settings for GuernseySpeaks (Coming Soon).</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Content filtering levels, announcement banners, etc.</p>
            </CardContent>
          </Card>

      </div>
    </MainLayout>
  );
}
