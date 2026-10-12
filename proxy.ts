import { withAuth } from 'next-auth/middleware'

// Admin pages and admin APIs require the admin role; everything else just a session.
export const proxy = withAuth({
  callbacks: {
    authorized: ({ token, req }) => {
      if (!token) return false
      const path = req.nextUrl.pathname
      if (path.startsWith('/admin') || path.startsWith('/api/admin')) return token.role === 'admin'
      return true
    },
  },
})

export const config = {
  matcher: [
    '/((?!api/auth|_next/static|_next/image|favicon.ico|login|register).*)',
  ],
}
