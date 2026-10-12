import { NextResponse } from 'next/server'
import { CaseError } from './service'

/** Runs a case command and maps CaseError to its HTTP status. */
export async function handle<T>(fn: () => Promise<T>): Promise<NextResponse> {
  try {
    return NextResponse.json((await fn()) ?? { success: true })
  } catch (e) {
    if (e instanceof CaseError) return NextResponse.json({ error: e.message, details: e.details }, { status: e.status })
    throw e
  }
}
