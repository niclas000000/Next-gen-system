import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { FileText, BookOpen, ClipboardList, Layout, HelpCircle, FileSignature } from 'lucide-react'

const DOC_TYPES = [
  {
    slug: 'policy',
    label: 'Policy',
    icon: BookOpen,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    description: 'High-level organizational directives that establish rules and principles.',
  },
  {
    slug: 'work-instruction',
    label: 'Work Instruction',
    icon: ClipboardList,
    color: 'text-green-600',
    bg: 'bg-green-50',
    description: 'Step-by-step instructions for performing a specific task or activity.',
  },
  {
    slug: 'procedure',
    label: 'Procedure',
    icon: FileText,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    description: 'Defined sequence of steps to carry out a process or activity.',
  },
  {
    slug: 'template',
    label: 'Template',
    icon: Layout,
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    description: 'Reusable document structures for standardizing output across the organization.',
  },
  {
    slug: 'guide',
    label: 'Guide',
    icon: HelpCircle,
    color: 'text-sky-600',
    bg: 'bg-sky-50',
    description: 'Reference material helping users understand systems, concepts, or practices.',
  },
  {
    slug: 'contract',
    label: 'Contract',
    icon: FileSignature,
    color: 'text-red-600',
    bg: 'bg-red-50',
    description: 'Formal agreements with defined obligations, approval flows, and review cycles.',
  },
]

export default function DocumentTypesPage() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Document Types</h1>
        <p className="text-sm text-slate-500 mt-1">
          Configure metadata schemas, approval workflows, and review cycles per document type.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {DOC_TYPES.map((dt) => {
          const Icon = dt.icon
          return (
            <Link key={dt.slug} href={`/design/document-types/${dt.slug}`}>
              <Card className="shadow-sm hover:shadow-md hover:border-blue-200 transition-all duration-200 cursor-pointer h-full">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className={`p-2 rounded-lg ${dt.bg} shrink-0`}>
                      <Icon size={16} className={dt.color} />
                    </div>
                    <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                      Coming soon
                    </Badge>
                  </div>
                  <p className="font-semibold text-slate-800 text-sm">{dt.label}</p>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-3">{dt.description}</p>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
