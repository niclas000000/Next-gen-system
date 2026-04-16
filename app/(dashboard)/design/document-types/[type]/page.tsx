import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft, Settings2 } from 'lucide-react'
import Link from 'next/link'

const LABELS: Record<string, string> = {
  'policy': 'Policy',
  'work-instruction': 'Work Instruction',
  'procedure': 'Procedure',
  'template': 'Template',
  'guide': 'Guide',
  'contract': 'Contract',
}

export default async function DocumentTypeDetailPage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = await params
  const label = LABELS[type] ?? type

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <Link href="/design/document-types" className="text-slate-400 hover:text-slate-600 transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{label}</h1>
          <p className="text-sm text-slate-500 mt-0.5">Document type configuration</p>
        </div>
      </div>

      <Card className="shadow-sm">
        <CardContent className="flex flex-col items-center justify-center py-20 text-center">
          <div className="p-5 rounded-full bg-slate-100 mb-4">
            <Settings2 size={28} className="text-slate-400" />
          </div>
          <div className="flex items-center gap-2 mb-2">
            <p className="font-semibold text-slate-700">{label} Configuration</p>
            <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">Coming soon</Badge>
          </div>
          <p className="text-sm text-slate-400 max-w-md">
            Metadata schema designer, approval workflow configuration, and review cycle settings for
            the <strong>{label}</strong> document type will be available here.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
