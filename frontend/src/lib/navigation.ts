import type { LucideIcon } from 'lucide-react'
import {
  ClipboardList,
  FileText,
  LayoutDashboard,
  UserCheck,
  Users,
  Vote,
} from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon?: LucideIcon
  end?: boolean
}

export const adminNavItems: NavItem[] = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/members', label: 'Members', icon: Users },
  { to: '/admin/positions', label: 'Positions', icon: ClipboardList },
  { to: '/admin/candidates', label: 'Candidates', icon: UserCheck },
  { to: '/admin/elections', label: 'Elections', icon: Vote },
  { to: '/admin/reports', label: 'Reports', icon: FileText },
]
