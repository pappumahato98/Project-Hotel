import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { User, Mail, Phone, MapPin, Loader2, Camera, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { trackActivity } from "@/utils/auditLogger";

export const PersonalDetailsTab = () => {
  const { profile, updateProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    first_name: profile?.first_name || "",
    last_name: profile?.last_name || "",
    phone: profile?.phone || "",
  });

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await updateProfile(formData);
      if (error) throw error;
      await trackActivity("Update Personal Information", "profile_update", formData);
      toast.success("Personal information updated successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("File size must be less than 2MB");
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile?.id}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await updateProfile({
        avatar_url: publicUrl,
      });

      if (updateError) throw updateError;

      await trackActivity("Update Avatar", "avatar_update", { url: publicUrl });
      toast.success("Avatar updated successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to upload avatar");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-1 space-y-6">
        <Card className="bg-[#0F172A] text-slate-100 border-none overflow-hidden rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-amber-400" />
              Account Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-[#1E293B]/50 p-3 rounded-xl border border-white/5">
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">User ID</p>
              <p className="text-sm font-mono truncate text-amber-200/90">{profile?.id}</p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div className="bg-[#1E293B]/50 p-3 rounded-xl border border-white/5">
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">Account Status</p>
                <p className="text-sm">Active</p>
              </div>
              <div className="bg-[#1E293B]/50 p-3 rounded-xl border border-white/5">
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">Email</p>
                <p className="text-sm truncate">{profile?.email || 'N/A'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-card">
        <CardHeader>
          <CardTitle>Profile Picture</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <div
            className="group relative h-32 w-32 rounded-full bg-gradient-blue flex items-center justify-center text-4xl font-bold text-primary-foreground overflow-hidden cursor-pointer"
            onClick={handleAvatarClick}
          >
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              <span>{profile?.first_name?.[0]}{profile?.last_name?.[0]}</span>
            )}

            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              {uploading ? <Loader2 className="h-8 w-8 animate-spin" /> : <Camera className="h-8 w-8 text-white" />}
            </div>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleFileChange}
            disabled={uploading}
          />

          <Button variant="outline" size="sm" onClick={handleAvatarClick} disabled={uploading}>
            {uploading ? "Uploading..." : "Change Avatar"}
          </Button>
          <p className="text-[10px] text-muted-foreground">JPG, GIF or PNG. Max size 2MB</p>
        </CardContent>
      </Card>
      </div>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>Update your personal details and contact information.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={formData.first_name}
                onChange={(e) => setFormData({...formData, first_name: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={formData.last_name}
                onChange={(e) => setFormData({...formData, last_name: e.target.value})}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input id="email" className="pl-9" defaultValue={profile?.email || ""} disabled />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="phone"
                className="pl-9"
                placeholder="+1 (555) 000-0000"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
              />
            </div>
          </div>
          <Button variant="blue" onClick={handleSave} disabled={loading} className="w-full sm:w-auto">
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Save Changes
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
