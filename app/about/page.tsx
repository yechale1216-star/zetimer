"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Shield, Users, Clock, Globe, ArrowRight, Star } from "lucide-react"
import { ModeToggle } from "@/components/mode-toggle"

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20">
      {/* Navigation */}
      <nav className="border-b border-border sticky top-0 bg-background/80 backdrop-blur-md z-50 w-full overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link href="/" className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-xs sm:text-sm">Z</span>
              </div>
              <span className="text-lg sm:text-xl font-bold tracking-tight">Zetime</span>
            </Link>
            <div className="flex items-center gap-2 sm:gap-4">
              <Link href="/login" className="text-xs sm:text-sm font-medium hover:text-primary transition-colors hidden sm:block">
                Login
              </Link>
              <div className="scale-90 sm:scale-100">
                <ModeToggle />
              </div>
              <Button asChild size="sm" className="h-9 sm:h-10 px-3 sm:px-4 text-xs sm:text-sm">
                <Link href="/login?signup=true">Get Started</Link>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main>
        {/* Hero Section */}
        <section className="relative py-20 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 -z-10" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <Badge text="Revolutionizing School Management" />
            <h1 className="text-3xl sm:text-4xl md:text-6xl font-extrabold tracking-tight mb-6 mt-4 px-2">
              Making Attendance <span className="text-primary">Effortless</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10">
              Zetime is a modern, comprehensive attendance tracking platform designed for educational institutions. 
              We empower schools with real-time data, automated notifications, and intuitive management tools.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="h-12 px-8 text-base" asChild>
                <Link href="/login?signup=true">Start Free Trial <ArrowRight className="ml-2 w-4 h-4" /></Link>
              </Button>
              <Button size="lg" variant="outline" className="h-12 px-8 text-base" asChild>
                <Link href="/login">View Demo</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Vision Section */}
        <section className="py-20 bg-muted/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold mb-6">Our Vision</h2>
                <p className="text-lg text-muted-foreground mb-6">
                  At Zetime, we believe that administrative tasks should never stand in the way of education. 
                  Our mission is to eliminate the manual burden of attendance tracking, allowing educators 
                  to focus on what truly matters: their students' growth and success.
                </p>
                <div className="space-y-4">
                  <FeatureItem text="Automated real-time reporting" />
                  <FeatureItem text="Seamless multi-role management" />
                  <FeatureItem text="Instant parent notifications" />
                  <FeatureItem text="Cloud-synced offline capabilities" />
                </div>
              </div>
              <div className="relative">
                <div className="absolute -inset-4 bg-primary/20 blur-3xl rounded-full -z-10 opacity-50" />
                <div className="bg-card border border-border rounded-2xl p-8 shadow-2xl relative overflow-hidden">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Star className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-bold">Trust by Educators</h4>
                      <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Quality Guaranteed</p>
                    </div>
                  </div>
                  <blockquote className="text-lg italic text-foreground/90">
                    "Zetime has transformed how we handle daily records. It's not just a tool; it's a vital part of our school's ecosystem."
                  </blockquote>
                  <div className="mt-6 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted" />
                    <div>
                      <p className="text-sm font-bold">Dr. Sarah Johnson</p>
                      <p className="text-xs text-muted-foreground">Principal, Springfield Academy</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Key Values */}
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold">Why Choose Zetime?</h2>
              <p className="text-muted-foreground mt-2">Built on three core pillars of excellence</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              <ValueCard 
                icon={<Shield className="w-8 h-8 text-blue-500" />}
                title="Security First"
                description="Your data is encrypted and stored securely, ensuring privacy for students and staff at all times."
              />
              <ValueCard 
                icon={<Users className="w-8 h-8 text-green-500" />}
                title="User Centric"
                description="Designed with feedback from real teachers and admins to ensure maximum usability and minimal friction."
              />
              <ValueCard 
                icon={<Globe className="w-8 h-8 text-purple-500" />}
                title="Scale Ready"
                description="Whether you're a small primary school or a large university campus, Zetime scales with your needs."
              />
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-20 bg-primary text-primary-foreground">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <StatItem value="500+" label="Schools" />
              <StatItem value="50k+" label="Students" />
              <StatItem value="1M+" label="Records Taken" />
              <StatItem value="99.9%" label="Uptime" />
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-12 bg-muted/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-[10px]">Z</span>
                </div>
                <span className="text-lg font-bold">Zetime</span>
              </div>
              <p className="text-sm text-muted-foreground max-w-sm">
                Empowering the next generation of schools with smart, automated attendance and management solutions.
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-4">Platform</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/about" className="hover:text-primary transition-colors">About Us</Link></li>
                <li><Link href="/pricing" className="hover:text-primary transition-colors">Pricing</Link></li>
                <li><Link href="/login" className="hover:text-primary transition-colors">Features</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-primary transition-colors">Terms of Service</Link></li>
                <li><Link href="/contact" className="hover:text-primary transition-colors">Contact</Link></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-border text-center text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Zetime Attendance Tracker. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}

function Badge({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary uppercase tracking-wider mb-4 border border-primary/20">
      {text}
    </span>
  )
}

function FeatureItem({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3">
      <CheckCircle2 className="w-5 h-5 text-green-500" />
      <span className="text-foreground/80 font-medium">{text}</span>
    </div>
  )
}

function ValueCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="p-8 bg-card border border-border rounded-2xl hover:shadow-xl transition-all hover:-translate-y-1">
      <div className="mb-6">{icon}</div>
      <h3 className="text-xl font-bold mb-3">{title}</h3>
      <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
    </div>
  )
}

function StatItem({ value, label }: { value: string, label: string }) {
  return (
    <div>
      <div className="text-4xl font-extrabold mb-1">{value}</div>
      <div className="text-primary-foreground/70 text-sm font-medium uppercase tracking-widest">{label}</div>
    </div>
  )
}
