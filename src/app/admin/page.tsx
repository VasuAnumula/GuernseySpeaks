
"use client";

import { MainLayout } from '@/components/layout/main-layout';
import { WeatherWidget } from '@/components/weather-widget';
import { AdPlaceholder } from '@/components/ad-placeholder';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { Users, ShieldAlert, ListChecks, Loader2, User as UserIconLucide, Image as ImageIcon, Link2, Trash2, PlusCircle, ToggleLeft, ToggleRight, UploadCloud } from 'lucide-react';
import { getUsers, setUserRole } from '@/services/userService';
import { createAdvertisement, getAllAdvertisements, updateAdvertisement, deleteAdvertisement } from '@/services/advertisementService';
import { getPendingReportCount } from '@/services/reportService';
import Link from 'next/link';
import type { User, Advertisement } from '@/types';
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
import Image from 'next/image'; // For displaying ad images
import { PlatformSettingsForm } from '@/components/admin/platform-settings-form';

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [platformUsers, setPlatformUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null);

  // Advertisement State
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [loadingAds, setLoadingAds] = useState(true);
  const [isSubmittingAd, setIsSubmittingAd] = useState(false);
  const [newAdTitle, setNewAdTitle] = useState('');
  const [newAdLinkUrl, setNewAdLinkUrl] = useState('');
  const [newAdIsActive, setNewAdIsActive] = useState(true);
  const [newAdImageFile, setNewAdImageFile] = useState<File | null>(null);
  const adImageInputRef = useRef<HTMLInputElement>(null);
  const [updatingAdStatusId, setUpdatingAdStatusId] = useState<string | null>(null);
  const [deletingAdId, setDeletingAdId] = useState<string | null>(null);
  const [pendingReportCount, setPendingReportCount] = useState<number>(0);
  const [loadingReportCount, setLoadingReportCount] = useState(true);


  useEffect(() => {
    if (!authLoading && (!user || (user.role !== 'superuser' && user.role !== 'moderator'))) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  const fetchPlatformData = async () => {
    if (user && (user.role === 'superuser' || user.role === 'moderator')) {
      setLoadingUsers(true);
      try {
        const fetchedUsers = await getUsers();
        setPlatformUsers(fetchedUsers);
      } catch (error) {
        console.error("Failed to fetch users:", error);
        toast({ title: "Error", description: "Could not fetch users.", variant: "destructive" });
      } finally {
        setLoadingUsers(false);
      }

      // Fetch pending report count
      setLoadingReportCount(true);
      try {
        const count = await getPendingReportCount();
        setPendingReportCount(count);
      } catch (error) {
        console.error("Failed to fetch report count:", error);
      } finally {
        setLoadingReportCount(false);
      }
    }
    if (user && user.role === 'superuser') {
      setLoadingAds(true);
      try {
        const fetchedAds = await getAllAdvertisements();
        setAds(fetchedAds);
      } catch (error) {
        console.error("Failed to fetch ads:", error);
        toast({ title: "Error", description: "Could not fetch advertisements.", variant: "destructive" });
      } finally {
        setLoadingAds(false);
      }
    }
  };

  useEffect(() => {
    fetchPlatformData();
  }, [user]); // Re-fetch if user changes (e.g., logs in as admin)

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

  const handleAdImageFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({ title: "File Too Large", description: "Ad image must be smaller than 5MB.", variant: "destructive" });
        setNewAdImageFile(null);
        if (adImageInputRef.current) adImageInputRef.current.value = "";
        return;
      }
      if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
        toast({ title: "Invalid File Type", description: "Please select a JPG, PNG, GIF or WEBP image.", variant: "destructive" });
        setNewAdImageFile(null);
        if (adImageInputRef.current) adImageInputRef.current.value = "";
        return;
      }
      setNewAdImageFile(file);
    } else {
      setNewAdImageFile(null);
    }
  };

  const handleCreateAdvertisement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || user.role !== 'superuser') {
      toast({ title: "Unauthorized", description: "Only superusers can create ads.", variant: "destructive" });
      return;
    }
    if (!newAdTitle.trim() || !newAdLinkUrl.trim() || !newAdImageFile) {
      toast({ title: "Missing Fields", description: "Title, Link URL, and Image are required for an ad.", variant: "destructive" });
      return;
    }
    setIsSubmittingAd(true);
    try {
      const imageFileBuffer = await newAdImageFile.arrayBuffer();
      await createAdvertisement(user.uid, newAdTitle.trim(), newAdLinkUrl.trim(), imageFileBuffer, newAdImageFile.type, newAdImageFile.name, newAdIsActive);
      toast({ title: "Advertisement Created", description: "The new ad has been successfully uploaded." });
      setNewAdTitle('');
      setNewAdLinkUrl('');
      setNewAdImageFile(null);
      if (adImageInputRef.current) adImageInputRef.current.value = "";
      setNewAdIsActive(true);
      fetchPlatformData(); // Refresh ads list
    } catch (error: any) {
      console.error("Failed to create advertisement:", error);
      toast({ title: "Ad Creation Failed", description: error.message || "Could not create ad.", variant: "destructive" });
    } finally {
      setIsSubmittingAd(false);
    }
  };

  const handleToggleAdStatus = async (adId: string, currentStatus: boolean) => {
    if (!user || user.role !== 'superuser') return;
    setUpdatingAdStatusId(adId);
    try {
      await updateAdvertisement(adId, { isActive: !currentStatus });
      setAds(prevAds => prevAds.map(ad => ad.id === adId ? { ...ad, isActive: !currentStatus, updatedAt: new Date() } : ad));
      toast({ title: "Ad Status Updated" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Could not update ad status.", variant: "destructive" });
    } finally {
      setUpdatingAdStatusId(null);
    }
  };

  const handleDeleteAdvertisement = async (adId: string, imageUrl: string) => {
    if (!user || user.role !== 'superuser') return;
    setDeletingAdId(adId);
    try {
      await deleteAdvertisement(adId, imageUrl);
      setAds(prevAds => prevAds.filter(ad => ad.id !== adId));
      toast({ title: "Advertisement Deleted" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Could not delete ad.", variant: "destructive" });
    } finally {
      setDeletingAdId(null);
    }
  };


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
                  <ShieldAlert className={`h-5 w-5 ${pendingReportCount > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {loadingReportCount ? <Loader2 className="h-5 w-5 animate-spin" /> : pendingReportCount}
                  </div>
                  <p className="text-xs text-muted-foreground">Pending reports</p>
                  <Button variant="outline" size="sm" className="mt-2 w-full" asChild>
                    <Link href="/admin/reports">Review Reports</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        {user.role === 'superuser' && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Advertisement Management</CardTitle>
              <CardDescription>Upload and manage advertisements for the platform. (Superuser only)</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateAdvertisement} className="space-y-4 mb-6 p-4 border rounded-lg">
                <h3 className="text-lg font-medium">Create New Advertisement</h3>
                <div className="space-y-1">
                  <Label htmlFor="ad-title">Ad Title</Label>
                  <Input id="ad-title" value={newAdTitle} onChange={(e) => setNewAdTitle(e.target.value)} placeholder="e.g., Summer Sale Banner" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="ad-link-url">Link URL</Label>
                  <Input id="ad-link-url" type="url" value={newAdLinkUrl} onChange={(e) => setNewAdLinkUrl(e.target.value)} placeholder="https://example.com/product" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="ad-image">Ad Image</Label>
                  <Input id="ad-image" type="file" accept="image/png, image/jpeg, image/gif, image/webp" onChange={handleAdImageFileChange} ref={adImageInputRef} />
                  {newAdImageFile && <p className="text-xs text-muted-foreground">Selected: {newAdImageFile.name}</p>}
                </div>
                <div className="flex items-center space-x-2">
                  <Switch id="ad-is-active" checked={newAdIsActive} onCheckedChange={setNewAdIsActive} />
                  <Label htmlFor="ad-is-active">Set as Active</Label>
                </div>
                <Button type="submit" disabled={isSubmittingAd || !newAdImageFile}>
                  {isSubmittingAd ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                  Upload & Create Ad
                </Button>
              </form>

              {loadingAds ? (
                <div className="flex justify-center items-center py-10">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="ml-2 text-muted-foreground">Loading advertisements...</p>
                </div>
              ) : ads.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No advertisements created yet.</p>
              ) : (
                <Table>
                  <TableCaption>List of all advertisements.</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Image</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Link URL</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ads.map((ad) => (
                      <TableRow key={ad.id}>
                        <TableCell>
                          <Image src={ad.imageUrl} alt={ad.title || 'Ad image'} width={80} height={80} className="rounded object-contain" data-ai-hint="advertisement thumbnail"/>
                        </TableCell>
                        <TableCell className="font-medium">{ad.title}</TableCell>
                        <TableCell>
                          <a href={ad.linkUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate max-w-[200px] block">
                            {ad.linkUrl}
                          </a>
                        </TableCell>
                        <TableCell>
                          <Badge variant={ad.isActive ? "default" : "outline"}>
                            {ad.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleToggleAdStatus(ad.id, ad.isActive)}
                            disabled={updatingAdStatusId === ad.id}
                            title={ad.isActive ? "Deactivate" : "Activate"}
                          >
                            {updatingAdStatusId === ad.id ? <Loader2 className="h-4 w-4 animate-spin" /> : (ad.isActive ? <ToggleRight className="h-4 w-4 text-green-500"/> : <ToggleLeft className="h-4 w-4 text-muted-foreground"/>)}
                          </Button>
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={() => handleDeleteAdvertisement(ad.id, ad.imageUrl)}
                            disabled={deletingAdId === ad.id}
                            title="Delete Ad"
                          >
                            {deletingAdId === ad.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}


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

        {user.role === 'superuser' && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Platform Settings</CardTitle>
              <CardDescription>Configure global settings for GuernseySpeaks.</CardDescription>
            </CardHeader>
            <CardContent>
              <PlatformSettingsForm adminUid={user.uid} />
            </CardContent>
          </Card>
        )}

      </div>
    </MainLayout>
  );
}
