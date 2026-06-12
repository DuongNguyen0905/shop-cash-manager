'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Lock, Calculator, ArrowRight, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { CurrencyInput } from '@/components/ui/currency-input'
import { mockDb } from '@/lib/mock-db'
import { supabase, isMock } from '@/lib/supabase'

type Shift = { cash_revenue: number; expense: number }
type Closing = { cash_reserved: number }

export default function ClosingPage() {
  const [cashTotal, setCashTotal] = useState('')
  const [cashReserved, setCashReserved] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [shifts, setShifts] = useState<Shift[]>([])
  const [closings, setClosings] = useState<Closing[]>([])

  useEffect(() => { 
    setMounted(true)
    fetchData()
  }, [])

  const fetchData = async () => {
    if (isMock) {
      setShifts(mockDb.shifts)
      setClosings(mockDb.closings)
      return
    }
    try {
      const [shRes, clRes] = await Promise.all([
        supabase.from('shifts').select('cash_revenue, expense'),
        supabase.from('closings').select('cash_reserved')
      ])
      setShifts(shRes.data || [])
      setClosings(clRes.data || [])
    } catch (error) {
      console.error(error)
    }
  }

  const expectedCash = useMemo(() => {
    if (!mounted) return 0;
    let allCash = 0;
    shifts.forEach(s => {
      allCash += (Number(s.cash_revenue) || 0) - (Number(s.expense) || 0);
    });
    let drawerToSafe = 0;
    closings.forEach(c => {
      drawerToSafe += Number(c.cash_reserved);
    });
    return allCash - drawerToSafe;
  }, [mounted, shifts, closings])

  const cTotal = Number(cashTotal) || 0
  const cRes = Number(cashReserved) || 0
  const nextDayOpening = cTotal - cRes

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (cTotal <= 0) {
      toast.error('Vui lòng nhập tiền mặt hiện có')
      return
    }
    if (cRes < 0 || cRes > cTotal) {
      toast.error('Tiền tách riêng không hợp lệ')
      return
    }

    if (isMock) {
      mockDb.addClosing({
        date: new Date().toISOString().split('T')[0],
        cash_total: cTotal,
        cash_reserved: cRes
      })
      if (cRes > 0) {
        mockDb.addReserve({
          date: new Date().toISOString().split('T')[0],
          amount: cRes,
          note: 'Rút cuối ngày'
        })
      }
    } else {
      const dateStr = new Date().toISOString().split('T')[0]
      await supabase.from('closings').insert([{ date: dateStr, cash_total: cTotal, cash_reserved: cRes }])
      if (cRes > 0) {
        await supabase.from('cash_reserve').insert([{ date: dateStr, amount: cRes, note: 'Rút cuối ngày' }])
      }
    }

    setIsSuccess(true)
    toast.success('Đóng ngày thành công')
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)
  }

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <CheckCircle2 className="w-24 h-24 text-green-500" />
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Đã chốt ngày hôm nay</h2>
          <p className="text-gray-500 mt-2">Tiền đầu ca ngày mai sẽ là {formatCurrency(nextDayOpening)}</p>
        </div>
        <Button onClick={() => setIsSuccess(false)} variant="outline">
          Đóng lại
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
          <Lock className="w-6 h-6 text-green-600" />
          Đóng ngày
        </h2>
        <p className="text-gray-500">Chốt tiền cuối ngày, tách quỹ và chuẩn bị cho ngày tiếp theo.</p>
      </div>

      <Card className="border-t-4 border-t-green-600 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-gray-400" />
            Tính toán chốt sổ
          </CardTitle>
          <CardDescription>
            Nhập số tiền thực tế bạn đang cầm cuối ngày
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <Label className="text-gray-700 font-semibold text-lg">Tổng tiền mặt đếm được</Label>
                  <span className="text-sm text-gray-500">
                    Phần mềm tính: <strong className="text-gray-700">{formatCurrency(expectedCash)}</strong>
                  </span>
                </div>
                <CurrencyInput
                  value={cashTotal}
                  onChangeValue={setCashTotal}
                  placeholder="Ví dụ: 8.000.000"
                  className="text-lg font-bold py-6 text-green-700"
                  required
                />
              </div>

              <div className="space-y-2 pt-4">
                <Label className="text-gray-700 font-semibold">Tiền muốn rút về Quỹ Tích Lũy</Label>
                <CurrencyInput
                  value={cashReserved}
                  onChangeValue={setCashReserved}
                  placeholder="Ví dụ: 5.000.000"
                  className="py-5"
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-green-50 border border-green-100 rounded-lg">
              <div>
                <p className="text-sm text-green-800 font-medium mb-1">Tiền để lại đầu ca ngày mai</p>
                <p className="text-3xl font-bold text-green-700">{formatCurrency(nextDayOpening)}</p>
              </div>
              <ArrowRight className="w-8 h-8 text-green-300" />
            </div>

            <Button type="submit" className="w-full bg-gray-900 hover:bg-gray-800 text-lg py-6 mt-4">
              Xác nhận Đóng Ngày
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
