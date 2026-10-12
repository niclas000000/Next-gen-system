import { demoMode } from '@/lib/auth/session'
import { LoginForm } from './LoginForm'

export default function LoginPage() {
  return <LoginForm demo={demoMode()} />
}
