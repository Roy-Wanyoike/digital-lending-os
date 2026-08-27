'use client'

import { useState, useMemo } from 'react'
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow 
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import {
  Phone,
  MessageSquare,
  Mail,
  MoreVertical,
  ArrowUpDown,
  Search,
  UserPlus,
  Eye,
  ChevronLeft,
  ChevronRight,
  Handshake,
  PhoneCall,
  ListPlus,
  Filter
} from 'lucide-react'
import { toast } from 'sonner'
import type { OverdueLoan, CollectionAgent, AgingBucket } from './types'

// Mock data for development - 18 overdue loans with realistic Kenyan data
const mockLoans: OverdueLoan[] = [
  {
    id: '1',
    loanNumber: 'LN-2026-000042',
    customerId: 'cust-001',
    customerName: 'John Kamau Mwangi',
    customerPhone: '+254712345678',
    customerEmail: 'john.kamau@email.com',
    principal: 50000,
    outstandingBalance: 42000,
    totalRepaid: 8000,
    daysInArrears: 12,
    status: 'IN_ARREARS',
    arrearsStatus: 'DAYS_8_30',
    assignedCollectorId: 'agent-001',
    collectorName: 'Sarah Chen',
    nextPaymentDue: '2026-02-15',
    disbursementDate: '2025-11-20',
    maturityDate: '2026-05-20',
    productName: 'Personal Loan',
    productCategory: 'CONSUMER',
    lastCollectionAt: new Date('2026-01-18'),
    riskLevel: 'MEDIUM'
  },
  {
    id: '2',
    loanNumber: 'LN-2025-000089',
    customerId: 'cust-002',
    customerName: 'Faith Achieng Oloo',
    customerPhone: '+254723456789',
    customerEmail: 'faith.achien@gmail.com',
    principal: 75000,
    outstandingBalance: 68500,
    totalRepaid: 6500,
    daysInArrears: 45,
    status: 'IN_ARREARS',
    arrearsStatus: 'DAYS_31_60',
    assignedCollectorId: 'agent-002',
    collectorName: 'James Omondi',
    nextPaymentDue: '2026-01-10',
    disbursementDate: '2025-08-15',
    maturityDate: '2026-02-15',
    productName: 'Business Loan',
    productCategory: 'SME',
    lastCollectionAt: new Date('2026-01-15'),
    riskLevel: 'HIGH'
  },
  {
    id: '3',
    loanNumber: 'LN-2025-000078',
    customerId: 'cust-003',
    customerName: 'Peter Njoroge Kimani',
    customerPhone: '+254734567890',
    principal: 30000,
    outstandingBalance: 28000,
    totalRepaid: 2000,
    daysInArrears: 78,
    status: 'IN_ARREARS',
    arrearsStatus: 'DAYS_61_90',
    assignedCollectorId: 'agent-001',
    collectorName: 'Sarah Chen',
    nextPaymentDue: '2025-12-20',
    disbursementDate: '2025-06-10',
    maturityDate: '2025-12-10',
    productName: 'Emergency Loan',
    productCategory: 'CONSUMER',
    lastCollectionAt: new Date('2026-01-10'),
    riskLevel: 'VERY_HIGH'
  },
  {
    id: '4',
    loanNumber: 'LN-2025-000067',
    customerId: 'cust-004',
    customerName: 'Mary Wanjiku Ndungu',
    customerPhone: '+254745678901',
    customerEmail: 'mary.wanjiku@yahoo.com',
    principal: 100000,
    outstandingBalance: 95000,
    totalRepaid: 5000,
    daysInArrears: 95,
    status: 'DEFAULTED',
    arrearsStatus: 'DAYS_91_120',
    assignedCollectorId: null,
    collectorName: null,
    nextPaymentDue: '2025-11-05',
    disbursementDate: '2025-05-20',
    maturityDate: '2025-11-20',
    productName: 'Asset Finance',
    productCategory: 'ASSET',
    lastCollectionAt: new Date('2025-12-20'),
    riskLevel: 'VERY_HIGH'
  },
  {
    id: '5',
    loanNumber: 'LN-2026-000015',
    customerId: 'cust-005',
    customerName: 'Daniel Otieno Awuor',
    customerPhone: '+254756789012',
    principal: 25000,
    outstandingBalance: 18000,
    totalRepaid: 7000,
    daysInArrears: 5,
    status: 'ACTIVE',
    arrearsStatus: 'DAYS_1_7',
    assignedCollectorId: 'agent-004',
    collectorName: 'Peter Kamau',
    nextPaymentDue: '2026-01-28',
    disbursementDate: '2025-12-01',
    maturityDate: '2026-06-01',
    productName: 'Salary Advance',
    productCategory: 'PAYROLL',
    lastCollectionAt: new Date('2026-01-19'),
    riskLevel: 'LOW'
  },
  {
    id: '6',
    loanNumber: 'LN-2026-000052',
    customerId: 'cust-006',
    customerName: 'Sarah Muthoni Githinji',
    customerPhone: '+254767890123',
    customerEmail: 'sarah.muthoni@outlook.com',
    principal: 40000,
    outstandingBalance: 35000,
    totalRepaid: 5000,
    daysInArrears: 22,
    status: 'IN_ARREARS',
   arrearsStatus: 'DAYS_8_30',
    assignedCollectorId: 'agent-002',
    collectorName: 'James Omondi',
    nextPaymentDue: '2026-02-01',
    disbursementDate: '2025-10-15',
    maturityDate: '2026-04-15',
    productName: 'Education Loan',
    productCategory: 'CONSUMER',
    lastCollectionAt: new Date('2026-01-17'),
    riskLevel: 'MEDIUM'
  },
  {
    id: '7',
    loanNumber: 'LN-2025-000098',
    customerId: 'cust-007',
    customerName: 'Joseph Kipchumba Rutto',
    customerPhone: '+254778901234',
    principal: 150000,
    outstandingBalance: 142000,
    totalRepaid: 8000,
    daysInArrears: 125,
    status: 'DEFAULTED',
    arrearsStatus: 'DAYS_OVER_120',
    assignedCollectorId: 'agent-003',
    collectorName: 'Grace Wanjiku',
    nextPaymentDue: '2025-09-15',
    disbursementDate: '2025-03-20',
    maturityDate: '2025-09-20',
    productName: 'Business Expansion',
    productCategory: 'SME',
    lastCollectionAt: new Date('2025-11-30'),
    riskLevel: 'SEVERE'
  },
  {
    id: '8',
    loanNumber: 'LN-2026-000034',
    customerId: 'cust-008',
    customerName: 'Esther Nyashomba Musyoka',
    customerPhone: '+254789012345',
    customerEmail: 'esther.musyoka@gmail.com',
    principal: 20000,
    outstandingBalance: 15000,
    totalRepaid: 5000,
    daysInArrears: 8,
    status: 'ACTIVE',
    arrearsStatus: 'DAYS_1_7',
    assignedCollectorId: 'agent-001',
    collectorName: 'Sarah Chen',
    nextPaymentDue: '2026-01-30',
    disbursementDate: '2025-12-20',
    maturityDate: '2026-06-20',
    productName: 'Quick Cash',
    productCategory: 'CONSUMER',
    lastCollectionAt: new Date('2026-01-20'),
    riskLevel: 'LOW'
  },
  {
    id: '9',
    loanNumber: 'LN-2025-000095',
    customerId: 'cust-009',
    customerName: 'Lucy Wanjiru Kamene',
    customerPhone: '+254790123456',
    principal: 60000,
    outstandingBalance: 55000,
    totalRepaid: 5000,
    daysInArrears: 55,
    status: 'IN_ARREARS',
    arrearsStatus: 'DAYS_31_60',
    assignedCollectorId: null,
    collectorName: null,
    nextPaymentDue: '2025-12-28',
    disbursementDate: '2025-07-10',
    maturityDate: '2026-01-10',
    productName: 'Home Improvement',
    productCategory: 'CONSUMER',
    lastCollectionAt: new Date('2026-01-05'),
    riskLevel: 'HIGH'
  },
  {
    id: '10',
    loanNumber: 'LN-2026-000061',
    customerId: 'cust-010',
    customerName: 'David Kimani Njogu',
    customerPhone: '+254701234567',
    customerEmail: 'david.kimani@hotmail.com',
    principal: 35000,
    outstandingBalance: 32000,
    totalRepaid: 3000,
    daysInArrears: 18,
    status: 'IN_ARREARS',
    arrearsStatus: 'DAYS_8_30',
    assignedCollectorId: 'agent-004',
    collectorName: 'Peter Kamau',
    nextPaymentDue: '2026-02-08',
    disbursementDate: '2025-11-01',
    maturityDate: '2026-05-01',
    productName: 'Emergency Loan',
    productCategory: 'CONSUMER',
    lastCollectionAt: new Date('2026-01-16'),
    riskLevel: 'MEDIUM'
  },
  {
    id: '11',
    loanNumber: 'LN-2025-000082',
    customerId: 'cust-011',
    customerName: 'Ann Wairimu Gakuru',
    customerPhone: '+254712345679',
    principal: 85000,
    outstandingBalance: 78000,
    totalRepaid: 7000,
    daysInArrears: 88,
    status: 'IN_ARREARS',
    arrearsStatus: 'DAYS_61_90',
    assignedCollectorId: 'agent-003',
    collectorName: 'Grace Wanjiku',
    nextPaymentDue: '2025-11-20',
    disbursementDate: '2025-05-25',
    maturityDate: '2025-11-25',
    productName: 'School Fees Loan',
    productCategory: 'CONSUMER',
    lastCollectionAt: new Date('2025-12-28'),
    riskLevel: 'VERY_HIGH'
  },
  {
    id: '12',
    loanNumber: 'LN-2026-000023',
    customerId: 'cust-012',
    customerName: 'Michael Mutua Kioko',
    customerPhone: '+254723456780',
    principal: 18000,
    outstandingBalance: 12000,
    totalRepaid: 6000,
    daysInArrears: 3,
    status: 'ACTIVE',
    arrearsStatus: 'DAYS_1_7',
    assignedCollectorId: 'agent-002',
    collectorName: 'James Omondi',
    nextPaymentDue: '2026-01-26',
    disbursementDate: '2026-01-05',
    maturityDate: '2026-07-05',
    productName: 'Mobile Loan',
    productCategory: 'DIGITAL',
    lastCollectionAt: new Date('2026-01-19'),
    riskLevel: 'LOW'
  },
  {
    id: '13',
    loanNumber: 'LN-2025-000071',
    customerId: 'cust-013',
    customerName: 'Grace Akinyi Odhiambo',
    customerPhone: '+254734567891',
    customerEmail: 'grace.akinyi@email.com',
    principal: 45000,
    outstandingBalance: 42000,
    totalRepaid: 3000,
    daysInArrears: 102,
    status: 'DEFAULTED',
    arrearsStatus: 'DAYS_91_120',
    assignedCollectorId: null,
    collectorName: null,
    nextPaymentDue: '2025-10-15',
    disbursementDate: '2025-04-20',
    maturityDate: '2025-10-20',
    productName: 'Furniture Loan',
    productCategory: 'ASSET',
    lastCollectionAt: new Date('2025-12-10'),
    riskLevel: 'SEVERE'
  },
  {
    id: '14',
    loanNumber: 'LN-2026-000048',
    customerId: 'cust-014',
    customerName: 'Brian Kiptoo Langat',
    customerPhone: '+254745678902',
    principal: 28000,
    outstandingBalance: 22000,
    totalRepaid: 6000,
    daysInArrears: 28,
    status: 'IN_ARREARS',
    arrearsStatus: 'DAYS_8_30',
    assignedCollectorId: 'agent-001',
    collectorName: 'Sarah Chen',
    nextPaymentDue: '2026-02-18',
    disbursementDate: '2025-10-28',
    maturityDate: '2026-04-28',
    productName: 'Personal Loan',
    productCategory: 'CONSUMER',
    lastCollectionAt: new Date('2026-01-18'),
    riskLevel: 'MEDIUM'
  },
  {
    id: '15',
    loanNumber: 'LN-2025-000105',
    customerId: 'cust-015',
    customerName: 'Catherine Mumbi Thuo',
    customerPhone: '+254756789013',
    customerEmail: 'cathy.thuo@gmail.com',
    principal: 120000,
    outstandingBalance: 115000,
    totalRepaid: 5000,
    daysInArrears: 145,
    status: 'DEFAULTED',
    arrearsStatus: 'DAYS_OVER_120',
    assignedCollectorId: 'agent-003',
    collectorName: 'Grace Wanjiku',
    nextPaymentDue: '2025-08-28',
    disbursementDate: '2025-02-28',
    maturityDate: '2025-08-28',
    productName: 'Medical Emergency',
    productCategory: 'CONSUMER',
    lastCollectionAt: new Date('2025-11-15'),
    riskLevel: 'SEVERE'
  },
  {
    id: '16',
    loanNumber: 'LN-2026-000056',
    customerId: 'cust-016',
    customerName: 'Samuel Maina Gikonyo',
    customerPhone: '+254767890124',
    principal: 22000,
    outstandingBalance: 19000,
    totalRepaid: 3000,
    daysInArrears: 15,
    status: 'IN_ARREARS',
    arrearsStatus: 'DAYS_8_30',
    assignedCollectorId: 'agent-004',
    collectorName: 'Peter Kamau',
    nextPaymentDue: '2026-02-05',
    disbursementDate: '2025-11-15',
    maturityDate: '2026-05-15',
    productName: 'Salary Advance',
    productCategory: 'PAYROLL',
    lastCollectionAt: new Date('2026-01-17'),
    riskLevel: 'LOW'
  },
  {
    id: '17',
    loanNumber: 'LN-2025-000088',
    customerId: 'cust-017',
    customerName: 'Rita Atieno Owino',
    customerPhone: '+254778901235',
    principal: 55000,
    outstandingBalance: 48000,
    totalRepaid: 7000,
    daysInArrears: 62,
    status: 'IN_ARREARS',
    arrearsStatus: 'DAYS_61_90',
    assignedCollectorId: 'agent-002',
    collectorName: 'James Omondi',
    nextPaymentDue: '2025-12-01',
    disbursementDate: '2025-06-01',
    maturityDate: '2025-12-01',
    productName: 'Business Loan',
    productCategory: 'SME',
    lastCollectionAt: new Date('2026-01-08'),
    riskLevel: 'HIGH'
  },
  {
    id: '18',
    loanNumber: 'LN-2026-000029',
    customerId: 'cust-018',
    customerName: 'Kevin Nganga Mbugua',
    customerPhone: '+254789012346',
    customerEmail: 'kevin.nganga@outlook.com',
    principal: 15000,
    outstandingBalance: 8000,
    totalRepaid: 7000,
    daysInArrears: 2,
    status: 'ACTIVE',
    arrearsStatus: 'DAYS_1_7',
    assignedCollectorId: null,
    collectorName: null,
    nextPaymentDue: '2026-01-25',
    disbursementDate: '2026-01-10',
    maturityDate: '2026-07-10',
    productName: 'Quick Cash',
    productCategory: 'DIGITAL',
    lastCollectionAt: new Date('2026-01-20'),
    riskLevel: 'LOW'
  }
]

// Available agents for assignment
const availableAgents: CollectionAgent[] = [
  { id: 'agent-001', name: 'Sarah Chen', email: 'sarah.chen@abepot.co.ke', role: 'AGENT' },
  { id: 'agent-002', name: 'James Omondi', email: 'james.omondi@abepot.co.ke', role: 'AGENT' },
  { id: 'agent-003', name: 'Grace Wanjiku', email: 'grace.wanjiku@abepot.co.ke', role: 'MANAGER' },
  { id: 'agent-004', name: 'Peter Kamau', email: 'peter.kamau@abepot.co.ke', role: 'AGENT' }
]

interface OverdueLoansTableProps {
  onLoanSelect?: (loan: OverdueLoan) => void
  filterBucket?: string | null
  filterCollector?: string
  highPriorityOnly?: boolean
}

export function OverdueLoansTable({
  onLoanSelect,
  filterBucket,
  filterCollector = 'all',
  highPriorityOnly = false
}: OverdueLoansTableProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [parFilter, setParFilter] = useState<string>('all')
  const [agentFilter, setAgentFilter] = useState<string>('all')
  const [amountMin, setAmountMin] = useState<string>('')
  const [amountMax, setAmountMax] = useState<string>('')
  const [currentPage, setCurrentPage] = useState(1)
  const [sortField, setSortField] = useState<string>('daysInArrears')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const itemsPerPage = 10

  // Filter and sort loans
  const filteredLoans = useMemo(() => {
    let result = [...mockLoans]

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(loan => 
        loan.customerName.toLowerCase().includes(query) ||
        loan.customerPhone.includes(query) ||
        loan.loanNumber.toLowerCase().includes(query)
      )
    }

    // Apply PAR bucket filter
    if (filterBucket) {
      const bucketMap: Record<string, string> = {
        '1-30 days': 'DAYS_1_7,DAYS_8_30',
        '31-60 days': 'DAYS_31_60',
        '61-90 days': 'DAYS_61_90',
        '91-120 days': 'DAYS_91_120',
        '120+ days': 'DAYS_OVER_120'
      }
      const statuses = bucketMap[filterBucket]?.split(',') || []
      if (statuses.length > 0) {
        result = result.filter(loan => statuses.includes(loan.arrearsStatus))
      }
    }

    // Apply PAR dropdown filter
    if (parFilter !== 'all') {
      const parMap: Record<string, { min: number; max?: number }> = {
        '1-7': { min: 0, max: 7 },
        '8-30': { min: 8, max: 30 },
        '31-60': { min: 31, max: 60 },
        '61-90': { min: 61, max: 90 },
        '91-120': { min: 91, max: 120 },
        '120+': { min: 121 }
      }
      const range = parMap[parFilter]
      if (range) {
        result = result.filter(loan => 
          loan.daysInArrears >= range.min && 
          (range.max === undefined || loan.daysInArrears <= range.max)
        )
      }
    }

    // Apply agent filter
    if (filterCollector === 'unassigned') {
      result = result.filter(loan => !loan.assignedCollectorId)
    } else if (filterCollector !== 'all') {
      result = result.filter(loan => loan.assignedCollectorId === filterCollector)
    }

    // Apply agent dropdown filter
    if (agentFilter !== 'all') {
      result = result.filter(loan => loan.assignedCollectorId === agentFilter)
    }

    // Apply amount range filter
    if (amountMin) {
      result = result.filter(loan => loan.outstandingBalance >= parseFloat(amountMin))
    }
    if (amountMax) {
      result = result.filter(loan => loan.outstandingBalance <= parseFloat(amountMax))
    }

    // Apply high priority filter
    if (highPriorityOnly) {
      result = result.filter(loan => loan.daysInArrears > 30)
    }

    // Apply sorting
    result.sort((a, b) => {
      let aVal = a[sortField as keyof OverdueLoan]
      let bVal = b[sortField as keyof OverdueLoan]
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc' 
          ? aVal.localeCompare(bVal) 
          : bVal.localeCompare(aVal)
      }
      
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
      }
      
      return 0
    })

    return result
  }, [searchQuery, filterBucket, parFilter, filterCollector, agentFilter, amountMin, amountMax, highPriorityOnly, sortField, sortDirection])

  // Pagination
  const totalPages = Math.ceil(filteredLoans.length / itemsPerPage)
  const paginatedLoans = filteredLoans.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  // Handle select all
  const handleSelectAll = () => {
    if (selectedIds.size === paginatedLoans.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(paginatedLoans.map(l => l.id)))
    }
  }

  // Handle row selection
  const handleSelectRow = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  // Handle sort
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  // Bulk actions
  const handleBulkAssign = async () => {
    toast.success(`Assigned ${selectedIds.size} loans to selected agent`)
    setSelectedIds(new Set())
  }

  const handleBulkSMS = async () => {
    toast.success(`Sending SMS to ${selectedIds.size} customers`)
    setSelectedIds(new Set())
  }

  const handleBulkCallQueue = async () => {
    toast.success(`Added ${selectedIds.size} loans to call queue`)
    setSelectedIds(new Set())
  }

  // Row actions
  const handleViewDetails = (loan: OverdueLoan) => {
    onLoanSelect?.(loan)
  }

  const handleLogPromise = (loan: OverdueLoan) => {
    toast.info(`Opening Promise-to-Pay form for ${loan.loanNumber}`)
    onLoanSelect?.(loan)
  }

  const handleInitiateCall = (loan: OverdueLoan) => {
    toast.success(`Initiating call to ${loan.customerName} at ${loan.customerPhone}`)
  }

  // Format currency
  const formatCurrency = (amount: number): string => `KSh ${amount.toLocaleString()}`

  // Get PAR badge color
  const getPARBadge = (days: number) => {
    if (days > 120) return 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-400 border-0'
    if (days > 90) return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400 border-0'
    if (days > 60) return 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-400 border-0'
    if (days > 30) return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400 border-0'
    return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400 border-0'
  }

  const getPARLabel = (days: number) => {
    if (days > 120) return '120+'
    if (days > 90) return '91-120'
    if (days > 60) return '61-90'
    if (days > 30) return '31-60'
    return '1-30'
  }

  // Format date
  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return '-'
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  return (
    <div className="space-y-4">
      {/* Filters and Search Bar */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search by name, phone, or loan ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 dark:border-slate-700"
          />
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-2 flex-wrap">
          {/* PAR Bucket Filter */}
          <Select value={parFilter} onValueChange={setParFilter}>
            <SelectTrigger className="w-[130px] dark:border-slate-700">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="PAR Bucket" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Buckets</SelectItem>
              <SelectItem value="1-7">1-7 days</SelectItem>
              <SelectItem value="8-30">8-30 days</SelectItem>
              <SelectItem value="31-60">31-60 days</SelectItem>
              <SelectItem value="61-90">61-90 days</SelectItem>
              <SelectItem value="91-120">91-120 days</SelectItem>
              <SelectItem value="120+">120+ days</SelectItem>
            </SelectContent>
          </Select>

          {/* Agent Filter */}
          <Select value={agentFilter} onValueChange={setAgentFilter}>
            <SelectTrigger className="w-[140px] dark:border-slate-700">
              <UserPlus className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Agent" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Agents</SelectItem>
              <SelectItem value="">Unassigned</SelectItem>
              {availableAgents.map(agent => (
                <SelectItem key={agent.id} value={agent.id}>{agent.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Amount Range */}
          <Input
            placeholder="Min Amount"
            type="number"
            value={amountMin}
            onChange={(e) => setAmountMin(e.target.value)}
            className="w-[110px] dark:border-slate-700"
          />
          <Input
            placeholder="Max Amount"
            type="number"
            value={amountMax}
            onChange={(e) => setAmountMax(e.target.value)}
            className="w-[110px] dark:border-slate-700"
          />
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
          <span className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
            {selectedIds.size} loan(s) selected
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleBulkAssign}>
              <UserPlus className="w-4 h-4 mr-1" />
              Assign Agent
            </Button>
            <Button size="sm" variant="outline" onClick={handleBulkSMS}>
              <MessageSquare className="w-4 h-4 mr-1" />
              Send SMS
            </Button>
            <Button size="sm" variant="outline" onClick={handleBulkCallQueue}>
              <ListPlus className="w-4 h-4 mr-1" />
              Call Queue
            </Button>
          </div>
        </div>
      )}

      {/* Data Table */}
      <div className="rounded-md border border-slate-200 dark:border-slate-700 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 dark:bg-slate-800/50">
              <TableHead className="w-12">
                <Checkbox 
                  checked={selectedIds.size === paginatedLoans.length && paginatedLoans.length > 0}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700"
                onClick={() => handleSort('loanNumber')}
              >
                <div className="flex items-center gap-1">
                  Loan ID
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </TableHead>
              <TableHead>Customer</TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700"
                onClick={() => handleSort('principal')}
              >
                <div className="flex items-center gap-1">
                  Principal
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700"
                onClick={() => handleSort('daysInArrears')}
              >
                <div className="flex items-center gap-1">
                  Days Overdue
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </TableHead>
              <TableHead>PAR Bucket</TableHead>
              <TableHead>Last Contact</TableHead>
              <TableHead>Agent</TableHead>
              <TableHead className="w-12">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedLoans.map((loan) => (
              <TableRow 
                key={loan.id}
                className={cn(
                  "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50",
                  selectedIds.has(loan.id) && "bg-emerald-50 dark:bg-emerald-900/10"
                )}
              >
                <TableCell>
                  <Checkbox 
                    checked={selectedIds.has(loan.id)}
                    onCheckedChange={() => handleSelectRow(loan.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </TableCell>
                <TableCell>
                  <span className="font-mono text-sm">{loan.loanNumber}</span>
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium">{loan.customerName}</p>
                    <p className="text-xs text-slate-500">{loan.customerPhone}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="font-semibold">{formatCurrency(loan.principal)}</span>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className={cn(getPARBadge(loan.daysInArrears))}>
                    {loan.daysInArrears} days
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={cn("text-xs", getPARBadge(loan.daysInArrears))}>
                    {getPARLabel(loan.daysInArrears)} days
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-slate-500">
                  {formatDate(loan.lastCollectionAt)}
                </TableCell>
                <TableCell>
                  {loan.collectorName ? (
                    <Badge variant="secondary" className="text-xs">
                      {loan.collectorName.split(' ')[0]}
                    </Badge>
                  ) : (
                    <span className="text-xs text-slate-400">Unassigned</span>
                  )}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleViewDetails(loan)}>
                        <Eye className="w-4 h-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleLogPromise(loan)}>
                        <Handshake className="w-4 h-4 mr-2" />
                        Log Promise-to-Pay
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleInitiateCall(loan)}>
                        <PhoneCall className="w-4 h-4 mr-2" />
                        Initiate Call
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toast.info(`Sending SMS to ${loan.customerPhone}`)}>
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Send SMS
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {paginatedLoans.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-slate-500">
                  No overdue loans found matching your filters
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredLoans.length)} of {filteredLoans.length} loans
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage(prev => prev - 1)}
            className="dark:border-slate-700"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage(prev => prev + 1)}
            className="dark:border-slate-700"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
