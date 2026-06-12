'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { login } from '@/app/actions/auth'
import { toast } from 'sonner'
import { Lock } from 'lucide-react'

export default function LoginPage() {
  const [pin, setPin] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const result = await login(pin)
      if (result.success) {
        toast.success('Đăng nhập thành công')
        router.push('/')
      } else {
        toast.error(result.error)
        setPin('')
      }
    } catch (error) {
      toast.error('Đã có lỗi xảy ra')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-sm border-0 shadow-xl rounded-2xl overflow-hidden">
        <CardHeader className="space-y-1 bg-green-600 text-white text-center py-8">
          <div className="mx-auto bg-green-500 p-3 rounded-full w-fit mb-2">
            <Lock className="w-6 h-6 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold">Shop Cash Manager</CardTitle>
          <CardDescription className="text-green-100">
            Nhập mã PIN để truy cập hệ thống
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Nhập mã PIN..."
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="text-center text-2xl tracking-widest py-6"
                autoFocus
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-green-600 hover:bg-green-700 text-lg py-6"
              disabled={isLoading || pin.length < 4}
            >
              {isLoading ? 'Đang kiểm tra...' : 'Đăng Nhập'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
