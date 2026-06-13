import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import ClientLayout from "@/components/ClientLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { User, Lock, Eye, EyeOff, ShieldCheck, Mail, Phone, MapPin, Calendar, AlertCircle } from "lucide-react";

export default function ClientAccountSettings() {
  const { user } = useAuth();
  const { data: profile, isLoading: profileLoading } = trpc.clientPortal.myProfile.useQuery();

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  const changePassword = trpc.password.change.useMutation({
    onSuccess: () => {
      toast.success("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordError("");
    },
    onError: (err) => {
      setPasswordError(err.message || "Failed to change password");
    },
  });

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }
    changePassword.mutate({ newPassword });
  };

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  };

  return (
    <ClientLayout>
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-serif font-bold text-slate-900">Account Settings</h1>
          <p className="text-slate-500 mt-1">Manage your portal account and personal information.</p>
        </div>

        {/* Profile info card */}
        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-amber-600" />
              <CardTitle className="text-lg font-serif">Profile Information</CardTitle>
            </div>
            <CardDescription>Your personal details on file with Dispute2Suit.</CardDescription>
          </CardHeader>
          <CardContent>
            {profileLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-5 bg-slate-100 rounded animate-pulse" />
                ))}
              </div>
            ) : profile ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Full Name</p>
                  <p className="text-slate-900 font-medium">{profile.firstName} {profile.lastName}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide flex items-center gap-1">
                    <Mail className="w-3 h-3" /> Email
                  </p>
                  <p className="text-slate-900">{profile.email || user?.email || "—"}</p>
                </div>

                {profile.phone && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide flex items-center gap-1">
                      <Phone className="w-3 h-3" /> Phone
                    </p>
                    <p className="text-slate-900">{profile.phone}</p>
                  </div>
                )}

                {profile.dateOfBirth && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Date of Birth
                    </p>
                    <p className="text-slate-900">{formatDate(profile.dateOfBirth)}</p>
                  </div>
                )}

                {(profile.address || profile.city) && (
                  <div className="space-y-1 sm:col-span-2">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> Address
                    </p>
                    <p className="text-slate-900">
                      {[profile.address, profile.city, profile.state, profile.zipCode]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-slate-500 text-sm">No profile information available.</p>
            )}

            <Separator className="my-4" />

            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-green-600" />
              <p className="text-sm text-slate-600">
                Portal account: <span className="font-medium text-slate-900">{user?.email || "—"}</span>
              </p>
              <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50 text-xs ml-auto">
                Active
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Change password card */}
        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-amber-600" />
              <CardTitle className="text-lg font-serif">Change Password</CardTitle>
            </div>
            <CardDescription>Update your portal login password. Use at least 6 characters.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-sm">
              {passwordError && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-slate-700">New Password</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPasswords ? "text" : "password"}
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pr-10"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(!showPasswords)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-slate-500">Must be at least 6 characters</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-slate-700">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type={showPasswords ? "text" : "password"}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              <Button
                type="submit"
                className="bg-amber-600 hover:bg-amber-700 text-white"
                disabled={changePassword.isPending}
              >
                {changePassword.isPending ? "Changing..." : "Update Password"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Support info */}
        <Card className="border-slate-200 bg-slate-50">
          <CardContent className="py-4">
            <p className="text-sm text-slate-600">
              Need to update your personal information or have questions about your account?{" "}
              <span className="font-medium text-slate-900">Contact your assigned representative</span> through
              the Comments section or call our office directly.
            </p>
          </CardContent>
        </Card>
      </div>
    </ClientLayout>
  );
}
