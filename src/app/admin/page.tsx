
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
import { Users, ShieldAlert, ListChecks, Loader2, User as UserIconLucide, Image as ImageIcon, Link2, Trash2, PlusCircle, ToggleLeft, ToggleRight, UploadCloud, Search, Ban, UserCheck, TrendingUp, TrendingDown, Minus, Calendar, History } from 'lucide-react';
import { getUsers, setUserRole, banUser, unbanUser, searchUsers } from '@/services/userService';
import { createAdvertisement, getAllAdvertisements, updateAdvertisement, deleteAdvertisement } from '@/services/advertisementService';
import { getPendingReportCount, getReportStats } from '@/services/reportService';
import { getRecentAdminActivity } from '@/services/auditLogService';
import Link from 'next/link';
import type { User, Advertisement, AuditLog } from '@/types';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { PlatformSettingsForm } from '@/components/admin/platform-settings-form';

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [platformUsers, setPlatformUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null);
  const [userSearchTerm, setUserSearchTerm] = useState('');

  // Ban dialog state
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [banTargetUser, setBanTargetUser] = useState<User | null>(null);
  const [banReason, setBanReason] = useState('');
  const [isBanning, setIsBanning] = useState(false);

  // Advertisement State
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [loadingAds, setLoadingAds] = useState(true);
  const [isSubmittingAd, setIsSubmittingAd] = useState(false);
  const [newAdTitle, setNewAdTitle] = useState('');
  const [newAdLinkUrl, setNewAdLinkUrl] = useState('');
  const [newAdIsActive, setNewAdIsActive] = useState(true);
  const [newAdImageFile, setNewAdImageFile] = useState<File | null>(null);
  const [newAdStartDate, setNewAdStartDate] = useState('');
  const [newAdEndDate, setNewAdEndDate] = useState('');
  const adImageInputRef = useRef<HTMLInputElement>(null);
  const [updatingAdStatusId, setUpdatingAdStatusId] = useState<string | null>(null);
  const [deletingAdId, setDeletingAdId] = useState<string | null>(null);

  // Report stats
  const [pendingReportCount, setPendingReportCount] = useState<number>(0);
  const [loadingReportCount, setLoadingReportCount] = useState(true);
  const [reportStats, setReportStats] = useState<{
    totalReports: number;
    pendingReports: number;
    resolvedReports: number;
    dismissedReports: number;
    reportsByReason: Record<string, number>;
    recentTrend: 'up' | 'down' | 'stable';
  } | null>(null);

  // Audit logs
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loadingAuditLogs, setLoadingAuditLogs] = useState(true);


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
        setFilteredUsers(fetchedUsers);
      } catch (error) {
        console.error("Failed to fetch users:", error);
        toast({ title: "Error", description: "Could not fetch users.", variant: "destructive" });
      } finally {
        setLoadingUsers(false);
      }

      // Fetch pending report count and stats
      setLoadingReportCount(true);
      try {
        const [count, stats] = await Promise.all([
          getPendingReportCount(),
          getReportStats()
        ]);
        setPendingReportCount(count);
        setReportStats(stats);
      } catch (error) {
        console.error("Failed to fetch report data:", error);
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

      // Fetch audit logs
      setLoadingAuditLogs(true);
      try {
        const logs = await getRecentAdminActivity(20);
        setAuditLogs(logs);
      } catch (error) {
        console.error("Failed to fetch audit logs:", error);
      } finally {
        setLoadingAuditLogs(false);
      }
    }
  };

  useEffect(() => {
    fetchPlatformData();
  }, [user]); // Re-fetch if user changes (e.g., logs in as admin)

  // Filter users when search term changes
  useEffect(() => {
    if (userSearchTerm.trim() === '') {
      setFilteredUsers(platformUsers);
    } else {
      const lowerSearch = userSearchTerm.toLowerCase();
      setFilteredUsers(platformUsers.filter(u =>
        (u.displayName?.toLowerCase().includes(lowerSearch)) ||
        (u.name?.toLowerCase().includes(lowerSearch)) ||
        (u.email?.toLowerCase().includes(lowerSearch))
      ));
    }
  }, [userSearchTerm, platformUsers]);

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
      await setUserRole(targetUserId, 'moderator', user.displayName || user.name || undefined);
      setPlatformUsers(prevUsers =>
        prevUsers.map(pUser =>
          pUser.uid === targetUserId ? { ...pUser, role: 'moderator' } : pUser
        )
      );
      toast({ title: "Role Updated", description: `User is now a moderator.` });
      // Refresh audit logs
      if (user.role === 'superuser') {
        const logs = await getRecentAdminActivity(20);
        setAuditLogs(logs);
      }
    } catch (error: any) {
      console.error(`Failed to make user ${targetUserId} a moderator:`, error);
      toast({ title: "Error", description: error.message || "Could not update user role.", variant: "destructive" });
    } finally {
      setUpdatingRoleId(null);
    }
  };

  const handleDemoteToUser = async (targetUserId: string) => {
    if (!user || user.role !== 'superuser') {
      toast({ title: "Unauthorized", description: "Only superusers can change roles.", variant: "destructive" });
      return;
    }

    setUpdatingRoleId(targetUserId);
    try {
      await setUserRole(targetUserId, 'user', user.displayName || user.name || undefined);
      setPlatformUsers(prevUsers =>
        prevUsers.map(pUser =>
          pUser.uid === targetUserId ? { ...pUser, role: 'user' } : pUser
        )
      );
      toast({ title: "Role Updated", description: `User has been demoted to regular user.` });
      // Refresh audit logs
      if (user.role === 'superuser') {
        const logs = await getRecentAdminActivity(20);
        setAuditLogs(logs);
      }
    } catch (error: any) {
      console.error(`Failed to demote user ${targetUserId}:`, error);
      toast({ title: "Error", description: error.message || "Could not update user role.", variant: "destructive" });
    } finally {
      setUpdatingRoleId(null);
    }
  };

  const openBanDialog = (targetUser: User) => {
    setBanTargetUser(targetUser);
    setBanReason('');
    setBanDialogOpen(true);
  };

  const handleBanUser = async () => {
    if (!user || user.role !== 'superuser' || !banTargetUser) {
      return;
    }

    setIsBanning(true);
    try {
      await banUser(banTargetUser.uid, banReason, user.displayName || user.name || undefined);
      setPlatformUsers(prevUsers =>
        prevUsers.map(pUser =>
          pUser.uid === banTargetUser.uid ? { ...pUser, isBanned: true, banReason } : pUser
        )
      );
      toast({ title: "User Banned", description: `${banTargetUser.displayName || banTargetUser.name || 'User'} has been banned.` });
      setBanDialogOpen(false);
      setBanTargetUser(null);
      setBanReason('');
      // Refresh audit logs
      const logs = await getRecentAdminActivity(20);
      setAuditLogs(logs);
    } catch (error: any) {
      console.error(`Failed to ban user:`, error);
      toast({ title: "Error", description: error.message || "Could not ban user.", variant: "destructive" });
    } finally {
      setIsBanning(false);
    }
  };

  const handleUnbanUser = async (targetUserId: string) => {
    if (!user || user.role !== 'superuser') {
      return;
    }

    setUpdatingRoleId(targetUserId);
    try {
      await unbanUser(targetUserId, user.displayName || user.name || undefined);
      setPlatformUsers(prevUsers =>
        prevUsers.map(pUser =>
          pUser.uid === targetUserId ? { ...pUser, isBanned: false, banReason: undefined } : pUser
        )
      );
      toast({ title: "User Unbanned", description: `User has been unbanned.` });
      // Refresh audit logs
      const logs = await getRecentAdminActivity(20);
      setAuditLogs(logs);
    } catch (error: any) {
      console.error(`Failed to unban user:`, error);
      toast({ title: "Error", description: error.message || "Could not unban user.", variant: "destructive" });
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
      const startDate = newAdStartDate ? new Date(newAdStartDate) : null;
      const endDate = newAdEndDate ? new Date(newAdEndDate) : null;
      await createAdvertisement(user.uid, newAdTitle.trim(), newAdLinkUrl.trim(), imageFileBuffer, newAdImageFile.type, newAdImageFile.name, newAdIsActive, startDate, endDate);
      toast({ title: "Advertisement Created", description: "The new ad has been successfully uploaded." });
      setNewAdTitle('');
      setNewAdLinkUrl('');
      setNewAdImageFile(null);
      if (adImageInputRef.current) adImageInputRef.current.value = "";
      setNewAdIsActive(true);
      setNewAdStartDate('');
      setNewAdEndDate('');
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="ad-start-date">Schedule Start Date (Optional)</Label>
                    <Input id="ad-start-date" type="datetime-local" value={newAdStartDate} onChange={(e) => setNewAdStartDate(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="ad-end-date">Schedule End Date (Optional)</Label>
                    <Input id="ad-end-date" type="datetime-local" value={newAdEndDate} onChange={(e) => setNewAdEndDate(e.target.value)} />
                  </div>
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
                      <TableHead className="w-[80px]">Image</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Schedule</TableHead>
                      <TableHead>Stats</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ads.map((ad) => {
                      const formatDate = (date: Date | any) => {
                        if (!date) return null;
                        try {
                          const d = date instanceof Date ? date : date.toDate?.() || new Date(date);
                          return format(d, "MMM d, yyyy HH:mm");
                        } catch { return null; }
                      };
                      return (
                        <TableRow key={ad.id}>
                          <TableCell>
                            <Image src={ad.imageUrl} alt={ad.title || 'Ad image'} width={60} height={60} className="rounded object-contain" data-ai-hint="advertisement thumbnail"/>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{ad.title}</div>
                            <a href={ad.linkUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:underline truncate max-w-[150px] block">
                              {ad.linkUrl}
                            </a>
                          </TableCell>
                          <TableCell>
                            <Badge variant={ad.isActive ? "default" : "outline"}>
                              {ad.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">
                            {ad.scheduledStart || ad.scheduledEnd ? (
                              <div className="space-y-1">
                                {ad.scheduledStart && <div><Calendar className="h-3 w-3 inline mr-1" />Start: {formatDate(ad.scheduledStart)}</div>}
                                {ad.scheduledEnd && <div><Calendar className="h-3 w-3 inline mr-1" />End: {formatDate(ad.scheduledEnd)}</div>}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">No schedule</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs">
                            <div>Clicks: {ad.clicks || 0}</div>
                            <div>Views: {ad.impressions || 0}</div>
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
                      );
                    })}
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
            {/* User Search */}
            <div className="mb-4">
              <div className="relative max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users by name or email..."
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              {userSearchTerm && (
                <p className="text-sm text-muted-foreground mt-2">
                  Showing {filteredUsers.length} of {platformUsers.length} users
                </p>
              )}
            </div>

            {loadingUsers ? (
              <div className="flex justify-center items-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-2 text-muted-foreground">Loading users...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                {userSearchTerm ? 'No users match your search.' : 'No users found.'}
              </p>
            ) : (
              <Table>
                <TableCaption>A list of all registered users on the platform.</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">Avatar</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Joined</TableHead>
                    {user.role === 'superuser' && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((pUser) => {
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
                      <TableRow key={pUser.uid} className={pUser.isBanned ? 'bg-destructive/10' : ''}>
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
                        <TableCell>
                          {pUser.isBanned ? (
                            <Badge variant="destructive">Banned</Badge>
                          ) : (
                            <Badge variant="outline" className="text-green-600">Active</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">{joinedDate}</TableCell>
                        {user.role === 'superuser' && (
                          <TableCell className="text-right space-x-1">
                            {isCurrentUserAdmin ? (
                              <Badge variant="secondary" className="opacity-70">Your Account</Badge>
                            ) : pUser.role === 'superuser' ? (
                              <Badge variant="default" className="opacity-70">Superuser</Badge>
                            ) : (
                              <div className="flex justify-end gap-1">
                                {/* Role management */}
                                {pUser.role === 'user' && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleMakeModerator(pUser.uid)}
                                    disabled={updatingRoleId === pUser.uid}
                                    title="Promote to Moderator"
                                  >
                                    {updatingRoleId === pUser.uid ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
                                  </Button>
                                )}
                                {pUser.role === 'moderator' && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDemoteToUser(pUser.uid)}
                                    disabled={updatingRoleId === pUser.uid}
                                    title="Demote to User"
                                  >
                                    {updatingRoleId === pUser.uid ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserIconLucide className="h-4 w-4" />}
                                  </Button>
                                )}
                                {/* Ban/Unban */}
                                {pUser.isBanned ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleUnbanUser(pUser.uid)}
                                    disabled={updatingRoleId === pUser.uid}
                                    title="Unban User"
                                    className="text-green-600 hover:text-green-700"
                                  >
                                    {updatingRoleId === pUser.uid ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
                                  </Button>
                                ) : (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openBanDialog(pUser)}
                                    title="Ban User"
                                    className="text-destructive hover:text-destructive"
                                  >
                                    <Ban className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            )}
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

        {/* Ban Dialog */}
        <Dialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ban User</DialogTitle>
              <DialogDescription>
                Are you sure you want to ban {banTargetUser?.displayName || banTargetUser?.name || 'this user'}? They will no longer be able to access the platform.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="ban-reason">Reason for ban</Label>
                <Textarea
                  id="ban-reason"
                  placeholder="Enter the reason for banning this user..."
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setBanDialogOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleBanUser} disabled={isBanning}>
                {isBanning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Ban className="mr-2 h-4 w-4" />}
                Ban User
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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

        {/* Report Statistics */}
        {user.role === 'superuser' && reportStats && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Report Statistics
                {reportStats.recentTrend === 'up' && <TrendingUp className="h-5 w-5 text-destructive" />}
                {reportStats.recentTrend === 'down' && <TrendingDown className="h-5 w-5 text-green-500" />}
                {reportStats.recentTrend === 'stable' && <Minus className="h-5 w-5 text-muted-foreground" />}
              </CardTitle>
              <CardDescription>Overview of content reports and moderation activity.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">{reportStats.totalReports}</div>
                  <div className="text-sm text-muted-foreground">Total Reports</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-orange-500">{reportStats.pendingReports}</div>
                  <div className="text-sm text-muted-foreground">Pending</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-green-500">{reportStats.resolvedReports}</div>
                  <div className="text-sm text-muted-foreground">Resolved</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-muted-foreground">{reportStats.dismissedReports}</div>
                  <div className="text-sm text-muted-foreground">Dismissed</div>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium mb-3">Reports by Reason</h4>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  {Object.entries(reportStats.reportsByReason).map(([reason, count]) => (
                    <div key={reason} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                      <span className="text-sm capitalize">{reason.replace('_', ' ')}</span>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Audit Logs */}
        {user.role === 'superuser' && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Admin Activity Log
              </CardTitle>
              <CardDescription>Recent administrative actions on the platform.</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingAuditLogs ? (
                <div className="flex justify-center items-center py-10">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="ml-2 text-muted-foreground">Loading audit logs...</p>
                </div>
              ) : auditLogs.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No admin activity recorded yet.</p>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {auditLogs.map((log) => {
                    let actionLabel = log.actionType.replace(/_/g, ' ');
                    let actionColor = 'text-muted-foreground';
                    if (log.actionType.includes('banned')) actionColor = 'text-destructive';
                    if (log.actionType.includes('unbanned')) actionColor = 'text-green-500';
                    if (log.actionType.includes('role')) actionColor = 'text-blue-500';
                    if (log.actionType.includes('deleted')) actionColor = 'text-destructive';
                    if (log.actionType.includes('hidden')) actionColor = 'text-orange-500';

                    let logDate = '';
                    if (log.createdAt) {
                      try {
                        const date = log.createdAt instanceof Date ? log.createdAt : (log.createdAt as any).toDate?.();
                        if (date) logDate = format(date, "MMM d, yyyy HH:mm");
                      } catch {}
                    }

                    return (
                      <div key={log.id} className="flex items-start gap-3 p-3 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`font-medium capitalize ${actionColor}`}>{actionLabel}</span>
                            <Badge variant="outline" className="text-xs">{log.targetType}</Badge>
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            By: {log.adminDisplayName || 'Admin'}
                            {typeof log.details?.reason === 'string' && log.details.reason && (
                              <span className="ml-2">- {log.details.reason}</span>
                            )}
                            {typeof log.details?.before === 'object' && log.details.before &&
                             typeof log.details?.after === 'object' && log.details.after &&
                             'role' in log.details.before && 'role' in log.details.after && (
                              <span className="ml-2">
                                ({String((log.details.before as Record<string, unknown>).role)} → {String((log.details.after as Record<string, unknown>).role)})
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground whitespace-nowrap">
                          {logDate}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

      </div>
    </MainLayout>
  );
}
