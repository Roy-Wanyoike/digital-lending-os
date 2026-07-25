'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Wallet, ArrowLeftRight, ArrowDownLeft, ArrowUpRight,
  Link2, Shield, BarChart3, Settings, Building2, Users,
  Bell, Gift, Recurring, FileText, LogOut, Menu, X
} from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/wallets', label: 'Wallets', icon: Wallet },
  { href: '/deposits', label: 'Deposits', icon: ArrowDownLeft },
  { href: '/withdrawals', label: 'Withdrawals', icon: ArrowUpRight },
  { href: '/conversion', label: 'Conversion', icon: ArrowLeftRight },
  { href: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { href: '/payment-links', label: 'Payment Links', icon: Link2 },
  { href: '/escrow', label: 'Escrow', icon: Shield },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/businesses', label: 'Businesses', icon: Building2 },
  { href: '/team', label: 'Team', icon: Users },
  { href: '/subscriptions', label: 'Subscriptions', icon: Recurring },
  { href: '/invoices', label: 'Invoices', icon: FileText },
  { href: '/referrals', label: 'Referrals', icon: Gift },
  { href: '/notifications', label: 'Notifications', icon: Bell },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function DashboardSidebar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={`${collapsed ? 'w-16' : 'w-64'} bg-white border-r h-screen flex flex-col transition-all duration-200`}>
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        {!collapsed && (
          <div>
            <h2 className="font-bold text-gray-900">Youngsend</h2>
            <p className="text-xs text-gray-500">Financial OS</p>
          </div>
        )}
        <button onClick={() => setCollapsed(!collapsed)} className="p-1 hover:bg-gray-100 rounded">
          {collapsed ? <Menu className="h-5 w-5" /> : <X className="h-5 w-5" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="p-4 border-t">
        {!collapsed && (
          <div className="mb-3">
            <p className="text-sm font-medium text-gray-900 truncate">{session?.user?.name || 'User'}</p>
            <p className="text-xs text-gray-500 truncate">{session?.user?.email}</p>
          </div>
        )}
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg w-full transition-colors"
          title={collapsed ? 'Sign Out' : undefined}
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}
