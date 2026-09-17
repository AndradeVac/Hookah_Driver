import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight, Eye, EyeOff, LockKeyhole, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useLocation, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { useAuth } from './AuthProvider'

const schema = z.object({
  username: z.email('Informe um e-mail válido.'),
  password: z.string().min(8, 'A senha deve ter pelo menos 8 caracteres.'),
})
type FormValues = z.infer<typeof schema>

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [showPassword, setShowPassword] = useState(false)
  const [serverError, setServerError] = useState('')
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function onSubmit(values: FormValues) {
    setServerError('')
    try {
      await login(values)
      const from = (location.state as { from?: string } | null)?.from ?? '/'
      navigate(from, { replace: true })
    } catch {
      setServerError('Não foi possível entrar. Confira seus dados e tente novamente.')
    }
  }

  return (
    <main className="login-page">
      <section className="login-art" aria-hidden="true">
        <div className="login-art-copy"><span className="eyebrow light">Lounge Hookah</span><h1>O ritmo da casa,<br /><em>em suas mãos.</em></h1><p>Uma gestão mais tranquila para uma operação que nunca para.</p></div>
        <div className="login-art-orbit orbit-one" /><div className="login-art-orbit orbit-two" /><div className="login-art-card"><Sparkles size={17} /><span>Seu espaço de gestão</span><strong>simples, presente, inteiro.</strong></div>
      </section>
      <section className="login-panel">
        <div className="login-form-wrap">
          <div className="login-brand"><img className="login-brand-logo" src="/images/logo.jpeg" alt="Hookah Drive" /></div>
          <div className="login-heading"><span className="eyebrow">Acesso administrativo</span><h2>Bem-vindo de volta.</h2><p>Entre para acompanhar sua operação.</p></div>
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <label className="form-field"><span>E-mail</span><input type="email" placeholder="voce@lounge.com" autoComplete="email" {...register('username')} />{errors.username && <small className="field-error">{errors.username.message}</small>}</label>
            <label className="form-field"><span>Senha</span><div className="password-wrap"><input type={showPassword ? 'text' : 'password'} placeholder="Sua senha" autoComplete="current-password" {...register('password')} /><button type="button" className="password-toggle" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>{errors.password && <small className="field-error">{errors.password.message}</small>}</label>
            {serverError && <div className="form-error"><LockKeyhole size={16} />{serverError}</div>}
            <button className="login-submit" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Entrando...' : <>Entrar no espaço <ArrowRight size={17} /></>}</button>
          </form>
          <p className="login-footnote">Acesso restrito à equipe de gestão.</p>
        </div>
      </section>
    </main>
  )
}
