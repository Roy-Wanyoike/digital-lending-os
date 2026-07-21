'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Link2, Zap, TrendingUp } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import {
  useApi, formatCurrency, formatDate, CURRENCY_FLAGS, getStatusBadgeVariant, getStatusColor,
  KPICard, LoadingSkeleton, type PaymentLink,
} from '@/lib/dashboard-helpers'

export function PaymentLinksTab() {
  const { data: links, loading } = useApi<PaymentLink[]>('/api/payment-links?limit=20')
  const [selectedLink, setSelectedLink] = useState<PaymentLink | null>(null)

  if (loading) return <LoadingSkeleton />

  const allLinks = links || []
  const totalLinks = allLinks.length
  const activeLinks = allLinks.filter(l => l.status?.toLowerCase() === 'active').length
  const totalCollected = 0

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPICard title="Total Links" value={totalLinks.toString()} icon={Link2} />
        <KPICard title="Active" value={activeLinks.toString()} icon={Zap} />
        <KPICard title="Total Collected" value={formatCurrency(totalCollected)} icon={TrendingUp} />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payments</TableHead>
                  <TableHead>Collected</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allLinks.map(link => (
                  <TableRow key={link.id} className="even:bg-muted/50 cursor-pointer hover:bg-muted" onClick={() => setSelectedLink(link)}>
                    <TableCell className="font-mono text-xs">{link.linkRef}</TableCell>
                    <TableCell className="font-medium max-w-[150px] truncate">{link.title}</TableCell>
                    <TableCell>{link.amount ? formatCurrency(link.amount, link.currency) : <Badge variant="outline">Open</Badge>}</TableCell>
                    <TableCell>{CURRENCY_FLAGS[link.currency]} {link.currency}</TableCell>
                    <TableCell><Badge variant={getStatusBadgeVariant(link.status)} className={getStatusColor(link.status)}>{link.status}</Badge></TableCell>
                    <TableCell className="text-xs">{link._paymentCount ?? 0}{link.maxPayments ? `/${link.maxPayments}` : ''}</TableCell>
                    <TableCell className="font-medium text-emerald-600">{formatCurrency(0, link.currency)}</TableCell>
                    <TableCell className="text-xs text-slate-500">{formatDate(link.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedLink} onOpenChange={() => setSelectedLink(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedLink?.title}</DialogTitle>
            <DialogDescription>{selectedLink?.linkRef}</DialogDescription>
          </DialogHeader>
          {selectedLink && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-500">Amount</p>
                  <p className="font-medium">{selectedLink.amount ? formatCurrency(selectedLink.amount, selectedLink.currency) : 'Open'}</p>
                </div>
                <div>
                  <p className="text-slate-500">Collected</p>
                  <p className="font-medium text-emerald-600">{formatCurrency(0, selectedLink.currency)}</p>
                </div>
                <div>
                  <p className="text-slate-500">Status</p>
                  <Badge variant={getStatusBadgeVariant(selectedLink.status)} className={getStatusColor(selectedLink.status)}>{selectedLink.status}</Badge>
                </div>
                <div>
                  <p className="text-slate-500">Payments</p>
                  <p className="font-medium">{selectedLink._paymentCount ?? 0}{selectedLink.maxPayments ? ` / ${selectedLink.maxPayments}` : ''}</p>
                </div>
              </div>
              <Separator />
              <h4 className="text-sm font-semibold">Payments Received</h4>
              <div className="max-h-48 overflow-y-auto">
                {(selectedLink.payments || []).map((p, i) => (
                  <div key={i} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0 text-sm">
                    <span className="font-mono text-xs">{p.reference}</span>
                    <span className="font-medium text-emerald-600">{formatCurrency(p.toAmount || p.fromAmount, p.toCurrency || p.fromCurrency)}</span>
                  </div>
                ))}
                {(!selectedLink.payments || selectedLink.payments.length === 0) && (
                  <p className="text-sm text-slate-400 text-center py-4">No payments yet</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
