import { prisma } from '@/lib/db/client'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FileText, GitBranch, CheckCircle, ToggleRight } from 'lucide-react'
import { NewDocumentTypeButton } from './NewDocumentTypeButton'
import { formatDistanceToNow } from 'date-fns'

export default async function DocumentTypesPage() {
  const types = await prisma.documentType.findMany({
    orderBy: { name: 'asc' },
    include: {
      approvalFlow: { select: { name: true } },
      _count: { select: { documents: true } },
    },
  })

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>Document Types</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--ink-4)' }}>
            Configure metadata fields, approval flows, and read receipt requirements per document type.
          </p>
        </div>
        <NewDocumentTypeButton />
      </div>

      {types.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <FileText size={32} className="mx-auto mb-3" style={{ color: 'var(--ink-4)' }} />
            <p className="font-medium" style={{ color: 'var(--ink-3)' }}>No document types yet</p>
            <p className="text-sm mt-1" style={{ color: 'var(--ink-4)' }}>
              Create your first document type to start configuring metadata and approval flows.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {types.map((dt) => {
            const fieldCount = Array.isArray(dt.propertyPackage)
              ? (dt.propertyPackage as unknown[]).filter((f: unknown) => {
                  const field = f as { type?: string }
                  return !['section', 'heading', 'divider'].includes(field.type ?? '')
                }).length
              : 0
            return (
              <Link key={dt.id} href={`/design/document-types/${dt.id}`}>
                <Card className="transition-all duration-200 cursor-pointer h-full hover:border-[var(--nw-accent)]">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="p-2 rounded-[2px] shrink-0" style={{ background: 'var(--paper-3)' }}>
                        <FileText size={16} style={{ color: 'var(--nw-accent)' }} />
                      </div>
                      <Badge variant="outline" className="text-xs font-mono shrink-0">
                        {dt.prefix}
                      </Badge>
                    </div>
                    <p className="font-semibold text-sm" style={{ color: 'var(--ink)' }}>{dt.name}</p>
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--ink-4)' }}>
                        <FileText size={11} className="shrink-0" />
                        {dt.format === 'richtext' ? 'Rich text' : 'File upload'}
                        <span style={{ color: 'var(--rule)' }}>·</span>
                        {fieldCount} propert{fieldCount !== 1 ? 'ies' : 'y'}
                      </div>
                      {dt.approvalFlow && (
                        <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--ink-4)' }}>
                          <GitBranch size={11} className="shrink-0" />
                          {dt.approvalFlow.name}
                        </div>
                      )}
                      <div className="flex items-center gap-3 text-xs pt-1" style={{ color: 'var(--ink-4)' }}>
                        {dt.requireReadReceipt && (
                          <span className="flex items-center gap-1"><CheckCircle size={10} />Read receipt</span>
                        )}
                        {dt.requireChangeDesc && (
                          <span className="flex items-center gap-1"><ToggleRight size={10} />Change desc</span>
                        )}
                        <span className="ml-auto">{dt._count.documents} doc{dt._count.documents !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                    <p className="text-xs mt-2" style={{ color: 'var(--ink-4)' }}>
                      Updated {formatDistanceToNow(new Date(dt.updatedAt), { addSuffix: true })}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
