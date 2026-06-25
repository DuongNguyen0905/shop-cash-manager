'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Lock, Calculator, ArrowRight, CheckCircle2, PiggyBank, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { CurrencyInput } from '@/components/ui/currency-input'
import { mockDb } from '@/lib/mock-db'

export default function ClosingPage() {
  const [amountToSafe, setAmountToSafe] = useState('')
  const [note, setNote] = useState('Đóng ngày, cất tiền vào két')
  const [isSuccess, setIsSuccess] = useState(false)
  const [currentCash, setCurrentCash] = useState(0)
  const [safeBalance, setSafeBalance] = useState(0)
  const [finalCash, setFinalCash] = useState(0)
  const [finalSafe, setFinalSafe] = useState(0)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = () => {
    // No need for async in mock, but keep structure for real API
    setCurrentCash(mockDb.getCurrentCash())
    setSafeBalance(mockDb.safe_balance)
  }

  const handleAmountChange = (value: string | undefined) => {
    const numValue = Number(value) || 0;
    if (numValue > currentCash) {
      toast.error('Số tiền cất vào két không thể lớn hơn tiền mặt hiện có.');
      setAmountToSafe(String(currentCash));
    } else {
      setAmountToSafe(value || '');
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const closingAmount = Number(amountToSafe) || 0
    if (closingAmount <= 0) {
      toast.error('Vui lòng nhập số tiền muốn cất vào két')
      return
    }
    if (closingAmount > currentCash) {
      toast.error('Không thể cất vào két số tiền lớn hơn tiền mặt hiện có.')
      return
    }

    try {
      mockDb.performClosing(closingAmount, note)
      
      setFinalCash(currentCash - closingAmount)
      setFinalSafe(safeBalance + closingAmount)
      setIsSuccess(true)
      toast.success('Đóng ngày thành công')
    } catch (error: any) {
      toast.error(error.message)
    }
  }
  
  const resetForm = () => {
    setIsSuccess(false);
    setAmountToSafe('');
    fetchData();
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)
  }

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <CheckCircle2 className="w-24 h-24 text-green-500" />
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Đã cất tiền vào két thành công</h2>
          <div className="grid grid-cols-2 gap-4 mt-4 text-left">
            <div className="text-gray-500">Tiền mặt còn lại:</div>
            <div className="font-bold text-gray-800">{formatCurrency(finalCash)}</div>
            <div className="text-gray-500">Tiền trong két mới:</div>
            <div className="font-bold text-gray-800">{formatCurrency(finalSafe)}</div>
          </div>
        </div>
        <Button onClick={resetForm} variant="outline">
          Thực hiện lần nữa
        </Button>
      </div>
    )
  }

  const amountNum = Number(amountToSafe) || 0;
  const cashAfter = currentCash - amountNum;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
          <Lock className="w-6 h-6 text-green-600" />
          Đóng ngày - Cất tiền vào két
        </h2>
        <p className="text-gray-500">Chuyển một phần tiền mặt hiện có vào két để quản lý an toàn hơn.</p>
      </div>

      <Card className="border-t-4 border-t-green-600 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-gray-400" />
            Thực hiện cất tiền
          </CardTitle>
          <CardDescription>
            Nhập số tiền bạn muốn chuyển từ ngăn kéo tiền mặt vào két.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4 text-center">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-800 font-medium flex items-center justify-center gap-1"><Wallet /> Tiền mặt hiện có</p>
                <p className="text-2xl font-bold text-blue-700">{formatCurrency(currentCash)}</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <p className="text-sm text-purple-800 font-medium flex items-center justify-center gap-1"><PiggyBank /> Tiền trong két</p>
                <p className="text-2xl font-bold text-purple-700">{formatCurrency(safeBalance)}</p>
              </div>
            </div>
            
            <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
              <div className="space-y-2">
                <Label className="text-gray-700 font-semibold text-lg">Số tiền muốn cất vào két</Label>
                <CurrencyInput
                  value={amountToSafe}
                  onChangeValue={handleAmountChange}
                  placeholder="Ví dụ: 5.000.000"
                  className="text-lg font-bold py-6 text-green-700"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-green-50 border border-green-100 rounded-lg">
              <div>
                <p className="text-sm text-green-800 font-medium mb-1">Tiền mặt còn lại (dự kiến)</p>
                <p className="text-3xl font-bold text-green-700">{formatCurrency(cashAfter)}</p>
              </div>
              <ArrowRight className="w-8 h-8 text-green-300" />
            </div>

            <Button type="submit" className="w-full bg-gray-900 hover:bg-gray-800 text-lg py-6 mt-4">
              Xác nhận cất tiền vào két
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
