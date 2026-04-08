import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ workflows: [] })
}

export async function POST() {
  return NextResponse.json({ message: 'Not implemented' }, { status: 501 })
}
