'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Network,
  Cloud,
  Server,
  Database,
  Cpu,
  Globe,
  Shield,
  Zap,
  MessageSquare,
  Smartphone,
  CreditCard,
  BarChart3
} from 'lucide-react'

interface ArchitectureLayer {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  color: string
  bgColor: string
  bgColorDark: string
  borderColor: string
  borderColorDark: string
  components: string[]
}

export function ArchitectureDiagram() {
  const layers: ArchitectureLayer[] = [
    {
      id: 'edge',
      name: 'Edge Layer',
      description: 'CDN, WAF, DDoS Protection',
      icon: <Cloud className="w-6 h-6" />,
      color: 'text-blue-700',
      bgColor: 'bg-blue-50',
      bgColorDark: 'dark:bg-blue-950/30',
      borderColor: 'border-blue-200',
      borderColorDark: 'dark:border-blue-800',
      components: ['Cloudflare CDN', 'WAF Rules', 'DDoS Mitigation', 'SSL/TLS Termination', 'Rate Limiting']
    },
    {
      id: 'frontend',
      name: 'Frontend Layer',
      description: 'Next.js Applications',
      icon: <Globe className="w-6 h-6" />,
      color: 'text-emerald-700 dark:text-emerald-400',
      bgColor: 'bg-emerald-50',
      bgColorDark: 'dark:bg-emerald-950/30',
      borderColor: 'border-emerald-200',
      borderColorDark: 'dark:border-emerald-800',
      components: ['Customer Portal (Next.js)', 'Lender Admin Dashboard', 'Super Admin Console', 'White-label Themes', 'PWA Support']
    },
    {
      id: 'api',
      name: 'API Services Layer',
      description: 'Go Microservices',
      icon: <Server className="w-6 h-6" />,
      color: 'text-purple-700 dark:text-purple-400',
      bgColor: 'bg-purple-50',
      bgColorDark: 'dark:bg-purple-950/30',
      borderColor: 'border-purple-200',
      borderColorDark: 'dark:border-purple-800',
      components: ['Loan Service', 'Customer Service', 'Payment Service', 'Notification Service', 'KYC/CRB Integration']
    },
    {
      id: 'workflow',
      name: 'Workflow Engine',
      description: 'Temporal Orchestration',
      icon: <Cpu className="w-6 h-6" />,
      color: 'text-orange-700 dark:text-orange-400',
      bgColor: 'bg-orange-50',
      bgColorDark: 'dark:bg-orange-950/30',
      borderColor: 'border-orange-200',
      borderColorDark: 'dark:border-orange-800',
      components: ['Loan Approval Workflow', 'Disbursement Pipeline', 'Collection Automation', 'Compliance Checks', 'Retry Logic']
    },
    {
      id: 'messaging',
      name: 'Event Bus',
      description: 'NATS JetStream Messaging',
      icon: <Zap className="w-6 h-6" />,
      color: 'text-amber-700 dark:text-amber-400',
      bgColor: 'bg-amber-50',
      bgColorDark: 'dark:bg-amber-950/30',
      borderColor: 'border-amber-200',
      borderColorDark: 'dark:border-amber-800',
      components: ['Event Streaming', 'Message Queues', 'Pub/Sub Patterns', 'Event Sourcing', 'Dead Letter Queue']
    },
    {
      id: 'data',
      name: 'Data Layer',
      description: 'Databases & Cache',
      icon: <Database className="w-6 h-6" />,
      color: 'text-slate-700 dark:text-slate-300',
      bgColor: 'bg-slate-50',
      bgColorDark: 'dark:bg-slate-800/50',
      borderColor: 'border-slate-200',
      borderColorDark: 'dark:border-slate-700',
      components: ['PostgreSQL (Primary)', 'PostgreSQL (Replica)', 'Redis Cache', 'ClickHouse Analytics', 'S3 Object Storage']
    },
    {
      id: 'integrations',
      name: 'External Integrations',
      description: 'Third-party Services',
      icon: <CreditCard className="w-6 h-6" />,
      color: 'text-teal-700 dark:text-teal-400',
      bgColor: 'bg-teal-50',
      bgColorDark: 'dark:bg-teal-950/30',
      borderColor: 'border-teal-200',
      borderColorDark: 'dark:border-teal-800',
      components: ['M-Pesa Daraja API', 'CRB Kenya Check', 'SMS Gateway (AfricaTalks)', 'WhatsApp Business', 'Email Service']
    }
  ]

  const techStack = [
    { category: 'Frontend', items: ['Next.js 16', 'React 19', 'TypeScript', 'Tailwind CSS', 'shadcn/ui'] },
    { category: 'Backend', items: ['Go 1.22', 'gRPC', 'REST APIs', 'JWT Auth'] },
    { category: 'Infrastructure', items: ['AWS / GCP', 'Docker', 'Kubernetes', 'Terraform', 'GitHub Actions'] },
    { category: 'Data', items: ['PostgreSQL 16', 'Redis 7', 'ClickHouse', 'Prisma ORM'] }
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
          <Network className="w-7 h-7 text-emerald-600" />
          System Architecture
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Digital Lending OS - Multi-tenant microservices architecture for Kenyan DCPs
        </p>
      </div>

      {/* Architecture Flow Diagram */}
      <Card className="overflow-hidden dark:bg-slate-800/50 dark:border-slate-700">
        <CardContent className="p-0">
          <div className="bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-900 p-6 space-y-4 transition-colors duration-300">
            {/* Visual Architecture Flow */}
            <div className="space-y-3">
              {layers.map((layer, index) => (
                <div 
                  key={layer.id}
                  className={`${layer.bgColor} ${layer.bgColorDark} border ${layer.borderColor} ${layer.borderColorDark} rounded-xl p-5 transition-all hover:shadow-md`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    {/* Layer Icon & Info */}
                    <div className={`flex items-center gap-3 ${layer.color} min-w-[250px]`}>
                      <div className={`p-2 rounded-lg bg-white dark:bg-slate-800 shadow-sm`}>
                        {layer.icon}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">{layer.name}</h3>
                        <p className="text-sm opacity-75">{layer.description}</p>
                      </div>
                    </div>

                    {/* Arrow for desktop */}
                    {index < layers.length - 1 && (
                      <div className="hidden lg:block text-slate-300 dark:text-slate-600 mx-4">
                        <svg width="40" height="20" viewBox="0 0 40 20">
                          <path d="M0 10 L35 10 M30 5 L37 10 L30 15" stroke="currentColor" strokeWidth="2" fill="none" />
                        </svg>
                      </div>
                    )}

                    {/* Components */}
                    <div className="flex-1 flex flex-wrap gap-2">
                      {layer.components.map((component) => (
                        <Badge 
                          key={component} 
                          variant="outline" 
                          className={`${layer.borderColor} ${layer.borderColorDark} ${layer.color} text-xs py-1 px-2`}
                        >
                          {component}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Mobile arrow */}
                  {index < layers.length - 1 && (
                    <div className="lg:hidden text-center text-slate-300 dark:text-slate-600 my-2">
                      <svg width="20" height="24" viewBox="0 0 20 24">
                        <path d="M10 0 L10 19 M5 14 L10 19 L15 14" stroke="currentColor" strokeWidth="2" fill="none" />
                      </svg>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tech Stack Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {techStack.map((stack) => (
          <Card key={stack.category} className="dark:bg-slate-800/50 dark:border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                {stack.category}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="space-y-2">
                {stack.items.map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                    <span className="text-slate-600 dark:text-slate-400">{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Key Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-l-4 border-l-emerald-500 dark:bg-slate-800/50 dark:border-l-emerald-500 dark:border-slate-700">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <Shield className="w-6 h-6 text-emerald-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Security First</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  End-to-end encryption, SOC 2 compliant, CBK regulatory compliance, 
                  multi-tenant data isolation at database level.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500 dark:bg-slate-800/50 dark:border-l-blue-500 dark:border-slate-700">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <BarChart3 className="w-6 h-6 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Real-time Analytics</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  ClickHouse-powered analytics with sub-second query times, 
                  real-time dashboards, and customizable reports.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500 dark:bg-slate-800/50 dark:border-l-purple-500 dark:border-slate-700">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <Smartphone className="w-6 h-6 text-purple-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Multi-channel</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Web portal, mobile app, USSD, WhatsApp bot, and SMS integration 
                  for omnichannel customer experience.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Integration Details */}
      <Card className="dark:bg-slate-800/50 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="w-5 h-5 text-teal-600" />
            External Integrations
          </CardTitle>
          <CardDescription>Third-party services connected to the platform</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { name: 'M-Pesa Daraja', type: 'Payment Gateway', status: 'Active', desc: 'STK Push, B2C, C2B payments' },
              { name: 'CRB Kenya', type: 'Credit Reference', status: 'Active', desc: 'Credit score checks and reporting' },
              { name: 'AfricaTalks SMS', type: 'Messaging', status: 'Active', desc: 'Transactional and marketing SMS' },
              { name: 'WhatsApp Business', type: 'Messaging', status: 'Beta', desc: 'Customer support automation' },
              { name: 'SendGrid', type: 'Email', status: 'Active', desc: 'Transaction emails and notifications' },
              { name: 'AWS S3', type: 'Storage', status: 'Active', desc: 'Document storage and CDN' }
            ].map((integration) => (
              <div key={integration.name} className={`border rounded-lg p-4 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors border-slate-200 dark:border-slate-700`}>
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-slate-900 dark:text-white">{integration.name}</h4>
                  <Badge variant={integration.status === 'Active' ? 'default' : 'secondary'} className={
                    integration.status === 'Active' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400 border-0' :
                    integration.status === 'Beta' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400 border-0' : ''
                  }>
                    {integration.status}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{integration.type}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">{integration.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Deployment Info */}
      <Card className="bg-gradient-to-r from-slate-800 to-slate-900 text-white border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-slate-400 text-sm">Target Uptime</p>
              <p className="text-2xl font-bold text-emerald-400">99.99%</p>
            </div>
            <div>
              <p className="text-slate-400 text-sm">Response Time (p95)</p>
              <p className="text-2xl font-bold">&lt; 200ms</p>
            </div>
            <div>
              <p className="text-slate-400 text-sm">Regions</p>
              <p className="text-2xl font-bold">2 (KE + EU)</p>
            </div>
            <div>
              <p className="text-slate-400 text-sm">Disaster Recovery</p>
              <p className="text-2xl font-bold text-amber-400">RPO &lt; 1hr</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
