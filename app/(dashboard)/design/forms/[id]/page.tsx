import { prisma } from '@/lib/db/client'
import { notFound } from 'next/navigation'
import { FormDesigner } from './FormDesigner'
import type { FormField, FormSettings } from '@/types/field'

export default async function FormDesignerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const form = await prisma.form.findUnique({ where: { id } })
  if (!form) notFound()

  return (
    <FormDesigner
      form={{
        id: form.id,
        name: form.name,
        description: form.description,
        fields: (form.fields as unknown as FormField[]) ?? [],
        settings: (form.settings as unknown as FormSettings) ?? {},
      }}
    />
  )
}
