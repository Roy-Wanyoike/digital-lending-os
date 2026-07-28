import DashboardGuard from '@/components/DashboardGuard'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardGuard>{children}</DashboardGuard>
}
