import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";

import { Scale, Shield, FileText, TrendingUp, CheckCircle, ArrowRight, Users, Award, Clock } from "lucide-react";
import { Link } from "wouter";

export default function Home() {
  const { user, isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Navigation */}
      <nav className="border-b border-slate-800/50 backdrop-blur-sm bg-slate-950/80 sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <Scale className="h-6 w-6 sm:h-8 sm:w-8 text-amber-500" />
              <span className="text-xl sm:text-2xl font-serif font-bold text-white">Dispute2Suit</span>
            </div>
            <div className="flex items-center gap-4">
              {isAuthenticated ? (
                <Link href="/admin/dashboard">
                  <Button variant="default" className="bg-amber-600 hover:bg-amber-700 text-white">
                    Dashboard
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/login">
                    <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-slate-800">
                      Sign In
                    </Button>
                  </Link>
                  <Link href="/login">
                    <Button className="bg-amber-600 hover:bg-amber-700 text-white">
                      Get Started
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-900/20 via-slate-950 to-slate-950" />
        <div className="container mx-auto px-4 sm:px-6 py-12 sm:py-16 md:py-24 relative">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs sm:text-sm font-medium mb-6 sm:mb-8">
              <Award className="h-4 w-4 shrink-0" />
              <span>Attorney-Backed Credit Repair Litigation</span>
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-serif font-bold text-white mb-4 sm:mb-6 leading-tight">
              From Dispute <span className="text-amber-500">to</span> Lawsuit
            </h1>
            <p className="text-base sm:text-xl text-slate-300 mb-6 sm:mb-8 leading-relaxed max-w-3xl mx-auto">
              Transform credit disputes into powerful FCRA litigation. Our platform connects credit repair professionals 
              with legal expertise to maximize client outcomes.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="/login">
                <Button size="lg" className="bg-amber-600 hover:bg-amber-700 text-white text-lg px-8 py-6 h-auto">
                  Get Started
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white text-lg px-8 py-6 h-auto">
                  Client Portal Access
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-y border-slate-800/50 bg-slate-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 sm:px-6 py-10 sm:py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
            {[
              { value: "$2.5M+", label: "Settlements Secured", icon: TrendingUp },
              { value: "500+", label: "Cases Filed", icon: FileText },
              { value: "95%", label: "Success Rate", icon: CheckCircle },
              { value: "50+", label: "Legal Teams", icon: Users },
            ].map((stat, idx) => (
              <div key={idx} className="text-center group">
                <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-amber-500/10 border border-amber-500/20 mb-3 sm:mb-4 group-hover:bg-amber-500/20 transition-colors">
                  <stat.icon className="h-5 w-5 sm:h-6 sm:w-6 text-amber-500" />
                </div>
                <div className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-white mb-1 sm:mb-2">{stat.value}</div>
                <div className="text-sm sm:text-base text-slate-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 sm:py-16 md:py-24">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center mb-10 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-serif font-bold text-white mb-3 sm:mb-4">
              Comprehensive Case Management
            </h2>
            <p className="text-base sm:text-xl text-slate-400 max-w-2xl mx-auto">
              Everything you need to manage credit disputes and litigation from intake to settlement
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
            {[
              {
                icon: Scale,
                title: "FCRA Litigation Platform",
                description: "Full case pipeline management from dispute to federal court filing with automated document generation and deadline tracking.",
              },
              {
                icon: Shield,
                title: "FDCPA Violations",
                description: "Comprehensive Fair Debt Collection Practices Act enforcement including harassment claims, validation disputes, and statutory damages.",
              },
              {
                icon: FileText,
                title: "State Law Consumer Violations",
                description: "State-specific consumer protection enforcement including unfair trade practices, deceptive lending, and local consumer rights violations.",
              },
              {
                icon: Users,
                title: "General Consumer Law",
                description: "Broad consumer protection representation covering warranty disputes, contract violations, fraud claims, and consumer rights enforcement.",
              },
              {
                icon: TrendingUp,
                title: "Analytics Dashboard",
                description: "Real-time insights into case performance, success rates, settlement values, and partner metrics with exportable reports.",
              },
              {
                icon: Clock,
                title: "Automated Workflows",
                description: "Email notifications, task assignments, deadline reminders, and status updates to keep cases moving efficiently.",
              },
            ].map((feature, idx) => (
              <div
                key={idx}
                className="group p-5 sm:p-6 md:p-8 rounded-lg border border-slate-800 bg-slate-900/50 hover:bg-slate-900 hover:border-amber-500/30 transition-all duration-300"
              >
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-lg bg-amber-500/10 border border-amber-500/20 mb-6 group-hover:bg-amber-500/20 group-hover:scale-110 transition-all">
                  <feature.icon className="h-7 w-7 text-amber-500" />
                </div>
                <h3 className="text-xl font-serif font-bold text-white mb-3">{feature.title}</h3>
                <p className="text-slate-400 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-16 md:py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-900/20 via-slate-900/50 to-emerald-900/20" />
        <div className="container mx-auto px-4 sm:px-6 relative">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-serif font-bold text-white mb-4 sm:mb-6">
              Ready to Transform Your Practice?
            </h2>
            <p className="text-base sm:text-xl text-slate-300 mb-6 sm:mb-8 max-w-2xl mx-auto">
              Join our network of credit repair professionals and attorneys leveraging FCRA violations 
              to secure substantial settlements for clients.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/login">
                <Button size="lg" className="bg-amber-600 hover:bg-amber-700 text-white text-lg px-8 py-6 h-auto">
                  Join Our Platform
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <a href="mailto:info@dispute2suit.com">
                <Button size="lg" variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white text-lg px-8 py-6 h-auto">
                  Schedule Consultation
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/50 bg-slate-950/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Scale className="h-6 w-6 text-amber-500" />
                <span className="text-xl font-serif font-bold text-white">Dispute2Suit</span>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">
                Professional credit repair litigation platform connecting partners with legal expertise.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Platform</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="text-slate-400 hover:text-amber-500 transition-colors">Features</a></li>
                <li><a href="#" className="text-slate-400 hover:text-amber-500 transition-colors">Pricing</a></li>
                <li><a href="#" className="text-slate-400 hover:text-amber-500 transition-colors">Case Studies</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="text-slate-400 hover:text-amber-500 transition-colors">FCRA Guide</a></li>
                <li><a href="#" className="text-slate-400 hover:text-amber-500 transition-colors">Documentation</a></li>
                <li><a href="#" className="text-slate-400 hover:text-amber-500 transition-colors">Support</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="text-slate-400 hover:text-amber-500 transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="text-slate-400 hover:text-amber-500 transition-colors">Terms of Service</a></li>
                <li><a href="#" className="text-slate-400 hover:text-amber-500 transition-colors">Compliance</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800/50 pt-8 text-center text-sm text-slate-500">
            <p>&copy; {new Date().getFullYear()} Dispute2Suit. All rights reserved. Attorney advertising.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
