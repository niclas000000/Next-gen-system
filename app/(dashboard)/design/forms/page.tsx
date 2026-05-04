import { prisma } from '@/lib/db/client'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { FileInput, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { NewFormButton } from './NewFormButton'

export default async function FormsListPage() {
  const forms = await prisma.form.findMany({
    orderBy: { updatedAt: 'desc' },
    select: { id: true, name: true, description: true, fields: true, updatedAt: true },
  })

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>Forms</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--ink-4)' }}>Design reusable forms for workflows and processes.</p>
        </div>
        <NewFormButton />
      </div>

      {forms.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 rounded-full mb-4" style={{ background: 'var(--paper-3)' }}>
              <FileInput size={24} style={{ color: 'var(--nw-accent)' }} />
            </div>
            <p className="font-medium" style={{ color: 'var(--ink-3)' }}>No forms yet</p>
            <p className="text-sm mt-1 mb-4" style={{ color: 'var(--ink-4)' }}>Create your first form to get started.</p>
            <NewFormButton />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {forms.map((form) => {
            const fieldCount = Array.isArray(form.fields) ? (form.fields as unknown[]).length : 0
            return (
              <Link key={form.id} href={`/design/forms/${form.id}`}>
                <Card className="transition-all duration-200 cursor-pointer h-full hover:border-[var(--nw-accent)]">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="p-2 rounded-[2px] shrink-0" style={{ background: 'var(--paper-3)' }}>
                        <FileInput size={16} style={{ color: 'var(--nw-accent)' }} />
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {fieldCount} field{fieldCount !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                    <p className="font-semibold text-sm leading-tight" style={{ color: 'var(--ink)' }}>{form.name}</p>
                    {form.description && (
                      <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--ink-4)' }}>{form.description}</p>
                    )}
                    <div className="flex items-center gap-1 mt-4 text-xs" style={{ color: 'var(--ink-4)' }}>
                      <Clock size={11} />
                      {formatDistanceToNow(new Date(form.updatedAt), { addSuffix: true })}
                    </div>
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
