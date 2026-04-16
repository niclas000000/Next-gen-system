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
          <h1 className="text-2xl font-semibold text-slate-900">Forms</h1>
          <p className="text-sm text-slate-500 mt-1">Design reusable forms for workflows and processes.</p>
        </div>
        <NewFormButton />
      </div>

      {forms.length === 0 ? (
        <Card className="shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 rounded-full bg-blue-50 mb-4">
              <FileInput size={24} className="text-blue-500" />
            </div>
            <p className="font-medium text-slate-700">No forms yet</p>
            <p className="text-sm text-slate-400 mt-1 mb-4">Create your first form to get started.</p>
            <NewFormButton />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {forms.map((form) => {
            const fieldCount = Array.isArray(form.fields) ? (form.fields as unknown[]).length : 0
            return (
              <Link key={form.id} href={`/design/forms/${form.id}`}>
                <Card className="shadow-sm hover:shadow-md hover:border-blue-200 transition-all duration-200 cursor-pointer h-full">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="p-2 rounded-lg bg-blue-50 shrink-0">
                        <FileInput size={16} className="text-blue-500" />
                      </div>
                      <Badge variant="outline" className="text-xs bg-slate-50 text-slate-600 border-slate-200">
                        {fieldCount} field{fieldCount !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                    <p className="font-semibold text-slate-800 text-sm leading-tight">{form.name}</p>
                    {form.description && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{form.description}</p>
                    )}
                    <div className="flex items-center gap-1 mt-4 text-xs text-slate-400">
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
