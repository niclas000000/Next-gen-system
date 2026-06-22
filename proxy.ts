import { withAuth } from 'next-auth/middleware'

export const proxy = withAuth

export const config = {
  matcher: [
    '/((?!api/auth|_next/static|_next/image|favicon.ico|login|register).*)',
  ],
}
