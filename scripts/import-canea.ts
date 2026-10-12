/**
 * Import a CANEA ONE workflow export (conf-import-tool) as a Nexus case type.
 *
 *   npx tsx scripts/import-canea.ts --workflow wf_dev.txt --rules wf_dev_rules.txt --registry wf_reg.xlsx [--out file.json] [--create]
 *
 * --create saves the result as a draft case type (prefix made unique); otherwise it only writes JSON
 * and prints the import report. The registry export is used for value lists only — people in it
 * are not imported.
 */
import { readFileSync, writeFileSync } from 'fs'
import { inflateRawSync } from 'zlib'
import { convertCaneaExport, type RegistryNode } from '@/lib/case-config/importers/canea-sql'
import { validateCaseType } from '@/lib/case-config/validate'

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`)
  return i > 0 ? process.argv[i + 1] : undefined
}

/** Reads the files of a zip archive (enough for .xlsx: stored or deflated entries). */
function unzip(buf: Buffer): Map<string, Buffer> {
  const out = new Map<string, Buffer>()
  let eocd = buf.length - 22
  while (eocd >= 0 && buf.readUInt32LE(eocd) !== 0x06054b50) eocd--
  if (eocd < 0) throw new Error('Not a zip file')
  const count = buf.readUInt16LE(eocd + 10)
  let p = buf.readUInt32LE(eocd + 16)
  for (let i = 0; i < count; i++) {
    const method = buf.readUInt16LE(p + 10)
    const size = buf.readUInt32LE(p + 20)
    const nameLen = buf.readUInt16LE(p + 28)
    const extraLen = buf.readUInt16LE(p + 30)
    const commentLen = buf.readUInt16LE(p + 32)
    const local = buf.readUInt32LE(p + 42)
    const name = buf.subarray(p + 46, p + 46 + nameLen).toString('utf8')
    const dataStart = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28)
    const data = buf.subarray(dataStart, dataStart + size)
    out.set(name, method === 8 ? inflateRawSync(data) : Buffer.from(data))
    p += 46 + nameLen + extraLen + commentLen
  }
  return out
}

const xmlText = (s: string) =>
  s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&')

/** First sheet of a registry export with the columns ID, Name, Path, Status. */
function readRegistry(file: string): RegistryNode[] {
  const files = unzip(readFileSync(file))
  const shared = [...(files.get('xl/sharedStrings.xml')?.toString('utf8') ?? '').matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) =>
    xmlText([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join(''))
  )
  const sheet = files.get('xl/worksheets/sheet1.xml')?.toString('utf8') ?? ''
  const rows = [...sheet.matchAll(/<row [^>]*>([\s\S]*?)<\/row>/g)].map((r) => {
    const cells: Record<string, string> = {}
    for (const c of r[1].matchAll(/<c r="([A-Z]+)\d+"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const v = (c[3] ?? '').match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? (c[3] ?? '').match(/<t[^>]*>([\s\S]*?)<\/t>/)?.[1] ?? ''
      cells[c[1]] = /t="s"/.test(c[2]) ? shared[Number(v)] : xmlText(v)
    }
    return cells
  })
  const [header, ...data] = rows
  const col = (name: string) => Object.entries(header).find(([, v]) => v === name)?.[0] ?? ''
  const [cId, cName, cPath, cStatus] = ['ID', 'Name', 'Path', 'Status'].map(col)
  return data
    .filter((r) => r[cId])
    .map((r) => ({ id: Number(r[cId]), name: r[cName] ?? '', path: r[cPath] ?? '', active: (r[cStatus] ?? 'Active') !== 'Inactive' }))
}

async function main() {
  const workflow = arg('workflow')
  if (!workflow) throw new Error('Usage: --workflow <file> [--rules <file>] [--registry <xlsx>] [--out <json>] [--create]')
  const rules = arg('rules')
  const reg = arg('registry')

  const { config, report } = convertCaneaExport(
    readFileSync(workflow, 'utf8'),
    rules ? readFileSync(rules, 'utf8') : null,
    reg ? readRegistry(reg) : null
  )
  const issues = validateCaseType(config)

  console.log(`\n${config.caseTypeName} (${config.prefix}) — ${config.phases.length} phases, ${config.fields.length} fields, ${config.roles.length} roles, ${config.phases.reduce((n, p) => n + p.rules.length, 0)} rules\n`)
  for (const [title, list] of [['Translated', report.translated], ['Approximated', report.approximated], ['Skipped', report.skipped]] as const) {
    if (!list.length) continue
    console.log(`${title} (${list.length})`)
    for (const line of list) console.log(`  · ${line}`)
  }
  console.log(`\nValidation: ${issues.filter((i) => i.severity === 'error').length} errors, ${issues.filter((i) => i.severity === 'warning').length} warnings`)
  for (const i of issues.filter((x) => x.severity === 'error')) console.log(`  ✗ ${i.message}`)

  const out = arg('out')
  if (out) {
    writeFileSync(out, JSON.stringify(config, null, 2) + '\n')
    console.log(`\nWrote ${out}`)
  }

  if (process.argv.includes('--create')) {
    const { prisma } = await import('@/lib/db/client')
    const owner = await prisma.user.findFirst({ where: { role: 'admin', active: true, id: { not: 'system-placeholder-user' } }, orderBy: { createdAt: 'asc' } })
    if (!owner) throw new Error('No admin user to own the case type')
    let prefix = config.prefix || 'IMP'
    for (let n = 2; await prisma.caseType.findUnique({ where: { prefix } }); n++) prefix = `${config.prefix || 'IMP'}${n}`
    const created = await prisma.caseType.create({
      data: { name: config.caseTypeName, prefix, draft: { ...config, prefix } as never, createdBy: owner.id },
    })
    console.log(`\nCreated draft case type "${config.caseTypeName}" (${prefix}) — open /design/case-types/${created.id}`)
    await prisma.$disconnect()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
