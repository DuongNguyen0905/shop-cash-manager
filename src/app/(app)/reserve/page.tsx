'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog'
import { PiggyBank, Plus, TrendingUp, TrendingDown, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react'
import { toast } from 'sonner'
import { supabase, isMock } from '@/lib/supabase'
import { mockDb } from '@/lib/mock-db'
import { CurrencyInput } from '@/components/ui/currency-input'
import { Trash2 } from 'lucide-react'
import { PinDialog } from '@/components/PinDialog'

type ReserveRecord = {
  id: string
  date: string
  amount: number
  note: string
}



export default function CashReservePage() {
  const [reserves, setReserves] = useState<ReserveRecord[]>([])
  const [shifts, setShifts] = useState<any[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [pinDialogOpen, setPinDialogOpen] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  // Form
  const [transactionType, setTransactionType] = useState<'add' | 'withdraw'>('add')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')

  const fetchReserves = async () => {
    setLoading(true)
    if (isMock) {
      setReserves([...mockDb.reserves].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()))
      setShifts(mockDb.shifts)
      setLoading(false)
      return
    }

    try {
      const [resRes, shRes] = await Promise.all([
        supabase.from('cash_reserve').select('*').order('date', { ascending: false }),
        supabase.from('shifts').select('cash_revenue, bank_revenue, expense')
      ]);
      if (resRes.error) throw resRes.error
      if (shRes.error) throw shRes.error
      setReserves(resRes.data || [])
      setShifts(shRes.data || [])
    } catch (error: any) {
      toast.error('Lỗi tải dữ liệu: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReserves()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!amount) return

    if (isMock) {
      const finalAmount = transactionType === 'withdraw' ? -Math.abs(Number(amount)) : Math.abs(Number(amount))
      mockDb.addReserve({
        date: new Date().toISOString().split('T')[0],
        amount: finalAmount,
        note
      })
      toast.success('Thêm giao dịch thành công')
      setIsOpen(false)
      setAmount('')
      setNote('')
      fetchReserves()
      return
    }

    try {
      const finalAmount = transactionType === 'withdraw' ? -Math.abs(Number(amount)) : Math.abs(Number(amount))
      const { error } = await supabase.from('cash_reserve').insert([
        {
          date: new Date().toISOString().split('T')[0],
          amount: finalAmount,
          note
        }
      ])
      if (error) throw error
      toast.success('Thêm giao dịch thành công')
      setIsOpen(false)
      setAmount('')
      setNote('')
      fetchReserves()
    } catch (error: any) {
      toast.error('Lỗi: ' + error.message)
    }
  }

  const handleDelete = (id: string) => {
    setPendingDeleteId(id)
    setPinDialogOpen(true)
  }

  const executeDelete = async (id: string) => {
      if (isMock) {
        mockDb.reserves = mockDb.reserves.filter(r => r.id !== id);
        mockDb.save();
        toast.success('Đã xóa giao dịch');
        fetchReserves();
        return;
      }
      try {
        const { error } = await supabase.from('cash_reserve').delete().eq('id', id);
        if (error) throw error;
        toast.success('Đã xóa giao dịch');
        fetchReserves();
      } catch (error: any) {
        toast.error('Lỗi khi xóa: ' + error.message);
      }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)
  }

  const totalIn = reserves.filter(r => r.amount > 0).reduce((sum, record) => sum + record.amount, 0)
  const totalOut = reserves.filter(r => r.amount < 0).reduce((sum, record) => sum + Math.abs(record.amount), 0)
  let netShiftRevenue = 0;
  shifts.forEach(s => {
    netShiftRevenue += (Number(s.cash_revenue) || 0) + (Number(s.bank_revenue) || 0) - (Number(s.expense) || 0);
  });
  const totalReserve = netShiftRevenue + totalIn - totalOut;

  return (
    <div className="space-y-6">
      <PinDialog 
        isOpen={pinDialogOpen} 
        onOpenChange={setPinDialogOpen}
        title="Xác nhận xóa"
        description="Nhập mã PIN để xóa giao dịch quỹ này."
        onConfirm={() => pendingDeleteId && executeDelete(pendingDeleteId)}
      />
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <PiggyBank className="w-6 h-6 text-green-600" />
            Quỹ tách riêng
          </h2>
          <p className="text-gray-500">Dòng tiền mặt và Vốn của quán.</p>
        </div>
        
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger render={
            <Button className="bg-green-600 hover:bg-green-700">
              <Plus className="w-4 h-4 mr-2" />
              Thêm giao dịch
            </Button>
          } />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Giao dịch quỹ</DialogTitle>
              <DialogDescription>Chọn loại giao dịch và nhập số tiền</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              
              <div className="grid grid-cols-2 gap-4">
                <Button 
                  type="button" 
                  variant={transactionType === 'withdraw' ? 'default' : 'outline'} 
                  className={transactionType === 'withdraw' ? 'bg-orange-500 hover:bg-orange-600' : ''}
                  onClick={() => setTransactionType('withdraw')}
                >
                  <ArrowUpFromLine className="w-4 h-4 mr-2" />
                  Rút ra (Mang về)
                </Button>
                <Button 
                  type="button" 
                  variant={transactionType === 'add' ? 'default' : 'outline'} 
                  className={transactionType === 'add' ? 'bg-green-600 hover:bg-green-700' : ''}
                  onClick={() => setTransactionType('add')}
                >
                  <ArrowDownToLine className="w-4 h-4 mr-2" />
                  Nộp vào (Thêm vốn)
                </Button>
              </div>

              <div className="space-y-2">
                <Label>Số tiền (VNĐ)</Label>
                <CurrencyInput
                  value={amount}
                  onChangeValue={setAmount}
                  placeholder="Ví dụ: 1.000.000"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Ghi chú</Label>
                <Input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Nhập ghi chú..."
                />
              </div>
              <Button type="submit" className="w-full bg-green-600 hover:bg-green-700">
                Lưu giao dịch
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-green-600 text-white border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-100 flex items-center gap-2">
              <PiggyBank className="w-4 h-4" />
              Tổng quỹ hiện tại
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(totalReserve)}</div>
            <p className="text-xs text-green-200 mt-1">Bao gồm toàn bộ thu/chi TM & CK từ trước đến nay</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
              Tổng nộp vào
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{formatCurrency(totalIn)}</div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-orange-500" />
              Tổng rút ra
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{formatCurrency(totalOut)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Lịch sử giao dịch</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 sm:pt-0">
          {loading ? (
            <div className="text-center py-4 text-gray-500">Đang tải...</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ngày</TableHead>
                    <TableHead>Loại</TableHead>
                    <TableHead className="text-right">Số tiền</TableHead>
                    <TableHead>Ghi chú</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reserves.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8">Chưa có giao dịch</TableCell></TableRow>
                  ) : (
                    reserves.map(record => (
                      <TableRow key={record.id}>
                        <TableCell>{record.date}</TableCell>
                        <TableCell>
                          {record.amount >= 0 ? (
                            <span className="text-green-600 flex items-center gap-1 text-sm"><TrendingUp className="w-3 h-3"/> Nộp vào</span>
                          ) : (
                            <span className="text-red-600 flex items-center gap-1 text-sm"><TrendingDown className="w-3 h-3"/> Rút ra</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {record.amount > 0 ? '+' : ''}{formatCurrency(record.amount)}
                        </TableCell>
                        <TableCell className="text-gray-500">{record.note}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(record.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
