import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function CROSignup() {
  const [, setLocation] = useLocation();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    companyName: "",
    agreementAccepted: false,
  });
  const [submitted, setSubmitted] = useState(false);

  const submitMutation = trpc.croApplications.submit.useMutation({
    onSuccess: () => {
      setSubmitted(true);
    },
    onError: (err) => toast.error(err.message),
  });

  const updateFormField = (field: keyof typeof formData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.agreementAccepted) {
      toast.error("Please accept the CRO agreement to continue");
      return;
    }
    submitMutation.mutate({
      name: formData.name,
      email: formData.email,
      phone: formData.phone || undefined,
      companyName: formData.companyName || undefined,
      agreementAccepted: formData.agreementAccepted,
    });
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-amber-50 p-4">
        <Card className="max-w-lg w-full border-slate-200 shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <CardTitle className="text-2xl font-serif">Application Submitted</CardTitle>
            <CardDescription className="text-base">
              Thank you for applying to become a CRO with Dispute2Suit.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-slate-600">
              Our admin team will review your application and get back to you shortly. You'll receive an email with your login credentials once approved.
            </p>
            <Button variant="outline" onClick={() => setLocation("/login")}>
              Return to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-amber-50 p-4">
      <Card className="max-w-lg w-full border-slate-200 shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 text-3xl">&#9878;&#65039;</div>
          <CardTitle className="text-3xl font-serif">CRO Registration</CardTitle>
          <CardDescription className="text-base">
            Apply to become a Credit Repair Organization partner with Dispute2Suit
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-semibold">Full Name *</Label>
              <Input
                id="name"
                placeholder="John Doe"
                value={formData.name}
                onChange={(e) => updateFormField('name', e.target.value)}
                className="border-slate-300"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-semibold">Email Address *</Label>
              <Input
                id="email"
                type="email"
                placeholder="john@example.com"
                value={formData.email}
                onChange={(e) => updateFormField('email', e.target.value)}
                className="border-slate-300"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-semibold">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1 (555) 123-4567"
                value={formData.phone}
                onChange={(e) => updateFormField('phone', e.target.value)}
                className="border-slate-300"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyName" className="text-sm font-semibold">Company Name</Label>
              <Input
                id="companyName"
                placeholder="Credit Repair Co."
                value={formData.companyName}
                onChange={(e) => updateFormField('companyName', e.target.value)}
                className="border-slate-300"
              />
            </div>

            <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg">
              <Checkbox
                id="agreement"
                checked={formData.agreementAccepted}
                onCheckedChange={(checked) => updateFormField('agreementAccepted', !!checked)}
                className="mt-0.5"
              />
              <Label htmlFor="agreement" className="text-sm text-slate-600 font-normal leading-relaxed cursor-pointer">
                I agree to the CRO Partner Agreement and understand that my application will be reviewed by the Dispute2Suit admin team. I certify that the information provided is accurate and that I am authorized to operate as a Credit Repair Organization.
              </Label>
            </div>

            <Button
              type="submit"
              className="w-full bg-amber-600 hover:bg-amber-700"
              disabled={submitMutation.isPending || !formData.agreementAccepted}
            >
              {submitMutation.isPending ? "Submitting..." : "Submit Application"}
            </Button>

            <p className="text-center text-sm text-slate-500">
              Already have an account?{" "}
              <button type="button" className="text-amber-600 hover:text-amber-700 font-medium" onClick={() => setLocation("/login")}>
                Sign in
              </button>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
