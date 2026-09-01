'use client';

/**
 * Status Page
 * 
 * System status and uptime monitoring.
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Header } from '@/components/roycss/navigation/Header';
import { Footer } from '@/components/roycss/navigation/Footer';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ArrowRight,
  Activity,
  Server,
  Globe,
  Database,
  Zap,
  RefreshCw
} from 'lucide-react';

// Service statuses
const services = [
  {
    name: 'CDN',
    description: 'Content delivery network for assets',
    status: 'operational' as const,
    icon: <Globe className="w-5 h-5" />,
    uptime: '99.99%',
  },
  {
    name: 'API',
    description: 'REST API endpoints',
    status: 'operational' as const,
    icon: <Zap className="w-5 h-5" />,
    uptime: '99.98%',
  },
  {
    name: 'Documentation',
    description: 'Docs site and search',
    status: 'operational' as const,
    icon: <Server className="w-5 h-5" />,
    uptime: '99.95%',
  },
  {
    name: 'Database',
    description: 'User data storage',
    status: 'degraded' as const,
    icon: <Database className="w-5 h-5" />,
    uptime: '99.90%',
  },
];

// Recent incidents
const incidents = [
  {
    title: 'Database latency increase',
    status: 'resolved',
    date: 'Dec 12, 2024',
    duration: '23 minutes',
    description: 'Experienced elevated database response times. Issue has been resolved.',
  },
  {
    title: 'CDN partial outage',
    status: 'resolved',
    date: 'Dec 8, 2024',
    duration: '1 hour 15 minutes',
    description: 'Some users experienced slow asset loading. CDN cache was cleared to resolve.',
  },
];

// Uptime data (last 30 days)
const uptimeDays = Array.from({ length: 30 }, (_, i) => ({
  date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000),
  status: Math.random() > 0.02 ? 'operational' : 'degraded', // 98% uptime simulation
}));

const statusConfig = {
  operational: {
    icon: <CheckCircle2 className="w-5 h-5" />,
    label: 'Operational',
    color: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-100 dark:bg-green-900/30',
    dot: 'bg-green-500',
  },
  degraded: {
    icon: <AlertTriangle className="w-5 h-5" />,
    label: 'Degraded Performance',
    color: 'text-yellow-600 dark:text-yellow-400',
    bg: 'bg-yellow-100 dark:bg-yellow-900/30',
    dot: 'bg-yellow-500',
  },
  down: {
    icon: <XCircle className="w-5 h-5" />,
    label: 'Outage',
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-100 dark:bg-red-900/30',
    dot: 'bg-red-500',
  },
};

export function StatusPageClient() {
  const overallStatus = services.some(s => s.status === 'down') 
    ? 'down' 
    : services.some(s => s.status === 'degraded') 
      ? 'degraded' 
      : 'operational';

  const overallConfig = statusConfig[overallStatus];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Header */}
      <div className="border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12 text-center">
          {/* Status Indicator */}
          <div className={cn(
            "inline-flex items-center gap-3 px-6 py-3 rounded-full mb-6",
            overallConfig.bg
          )}>
            <span className={cn("w-3 h-3 rounded-full animate-pulse", overallConfig.dot)} />
            <span className={cn("font-semibold", overallConfig.color)}>
              All Systems {overallConfig.label}
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">
            System Status
          </h1>
          <p className="text-muted-foreground">
            Real-time monitoring of ROYCSS services and infrastructure.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
        {/* Services Status */}
        <section>
          <h2 className="font-semibold mb-4">Services</h2>
          
          <Card>
            <CardContent className="p-0 divide-y divide-border/50">
              {services.map((service) => {
                const config = statusConfig[service.status];
                return (
                  <div key={service.name} className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors">
                    <div className="p-2 rounded-lg bg-muted shrink-0">
                      {service.icon}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{service.name}</span>
                        <Badge variant="secondary" className={cn("text-[10px]", config.bg, config.color)}>
                          {config.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{service.description}</p>
                    </div>
                    
                    <div className="text-right shrink-0 hidden sm:block">
                      <div className="text-sm font-medium">{service.uptime}</div>
                      <div className="text-xs text-muted-foreground">uptime</div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </section>

        {/* Uptime Graph */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Uptime (Last 30 Days)</h2>
            <Button variant="ghost" size="sm">
              <RefreshCw className="w-4 h-4 mr-1" />
              Refresh
            </Button>
          </div>
          
          <Card>
            <CardContent className="p-6">
              {/* Simple uptime visualization */}
              <div className="flex items-end gap-1 h-16">
                {uptimeDays.map((day, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex-1 rounded-sm transition-colors",
                      day.status === 'operational' ? 'bg-green-500' : 'bg-yellow-500'
                    )}
                    title={`${day.date.toLocaleDateString()}: ${day.status}`}
                  />
                ))}
              </div>
              
              <div className="flex items-center justify-between mt-4 text-xs text-muted-foreground">
                <span>30 days ago</span>
                <span>Today</span>
              </div>
              
              <div className="mt-4 pt-4 border-t flex items-center justify-center gap-6 text-sm">
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm bg-green-500" />
                  Operational
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm bg-yellow-500" />
                  Degraded
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm bg-red-500" />
                  Outage
                </span>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Recent Incidents */}
        <section>
          <h2 className="font-semibold mb-4">Recent Incidents</h2>
          
          <div className="space-y-4">
            {incidents.map((incident) => (
              <Card key={incident.title} className="hover:border-primary/20 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
                      <div>
                        <h3 className="font-medium">{incident.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{incident.description}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span>{incident.date}</span>
                          <span>•</span>
                          <span>{incident.duration}</span>
                        </div>
                      </div>
                    </div>
                    
                    <Badge variant="secondary" className="shrink-0 text-green-700 bg-green-50 dark:bg-green-900/30 dark:text-green-400">
                      Resolved
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Subscribe to Updates */}
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 border-primary/20">
          <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Activity className="w-6 h-6 text-primary" />
              <div>
                <h3 className="font-semibold">Subscribe to Updates</h3>
                <p className="text-sm text-muted-foreground">Get notified about service disruptions.</p>
              </div>
            </div>
            <Button variant="outline" size="sm">
              Subscribe
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
}

export default StatusPageClient;
