'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog'
import { PiggyBank, Plus, Wallet, Trash2, Ban } from 'lucide-react'
import { toast } from 'sonner'
import { mockDb } from '@/lib/mock-db'
import { CurrencyInput } from '@/components/ui/currency-input'
import { PinDialog } from '@/components/PinDialog'

// Reflects the updated Reserve type in mock-db
type ReserveRecord = {
  id: string
  created_at: string
  amount: number
  note: string
  source?: 'CASH' | 'SAFE'
  is_deleted?: boolean
}

export default function CashReservePage() {
  const [reserves, setReserves] = useState<ReserveRecord[]>([])
  const [currentCash, setCurrentCash] = useState(0)
  const [safeBalance, setSafeBalance] = useState(0)
  
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [pinDialogOpen, setPinDialogOpen] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  // Form state
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [source, setSource] = useState<'CASH' | 'SAFE'>('CASH')

  const fetchData = () => {
    setLoading(true)
    setCurrentCash(mockDb.getCurrentCash())
    setSafeBalance(mockDb.safe_balance)
    setReserves([...mockDb.reserves].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()))
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const numAmount = Number(amount) || 0
    if (numAmount <= 0) {
      toast.error("Vui lòng nhập số tiền hợp lệ.")
      return
    }

    try {
      mockDb.addWithdrawal(numAmount, note, source)
      toast.success('Rút tiền thành công')
      setIsOpen(false)
      setAmount('')
      setNote('')
      setSource('CASH')
      fetchData()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const handleDelete = (id: string) => {
    setPendingDeleteId(id)
    setPinDialogOpen(true)
  }

  const executeDelete = (id: string) => {
    try {
      mockDb.deleteReserve(id)
      toast.success('Đã huỷ khoản rút. Tiền đã được hoàn lại.')
      fetchData()
    } catch (error: any) {
      toast.error('Lỗi khi huỷ: ' + error.message)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)
  }

  const sourceBalance = source === 'CASH' ? currentCash : safeBalance;

  return (
    <div className="space-y-6">
      <PinDialog 
        isOpen={pinDialogOpen} 
        onOpenChange={setPinDialogOpen}
        title="Xác nhận huỷ"
        description="Nhập mã PIN để xác nhận huỷ khoản rút tiền này. Tiền sẽ được hoàn lại vào quỹ."
        onConfirm={() => pendingDeleteId && executeDelete(pendingDeleteId)}
      />
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <PiggyBank className="w-6 h-6 text-orange-600" />
            Rút tiền & Quản lý Quỹ
          </h2>
          <p className="text-gray-500">Rút tiền từ các quỹ của cửa hàng và xem lại lịch sử.</p>
        </div>
        
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger render={
            <Button className="bg-orange-600 hover:bg-orange-700">
              <Plus className="w-4 h-4 mr-2" />
              Tạo khoản rút
            </Button>
          } />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tạo khoản rút tiền</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Nguồn tiền</Label>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <button
                    type="button"
                    onClick={() => setSource('CASH')}
                    className={`flex flex-col items-center justify-between rounded-md border-2 bg-popover p-4 hover:bg-accent hover:text-accent-foreground ${source === 'CASH' ? 'border-primary' : 'border-muted'}`}
                  >
                    <Wallet className="mb-3 h-6 w-6" />
                    Tiền mặt
                  </button>
                  <button
                    type="button"
                    onClick={() => setSource('SAFE')}
                    className={`flex flex-col items-center justify-between rounded-md border-2 bg-popover p-4 hover:bg-accent hover:text-accent-foreground ${source === 'SAFE' ? 'border-primary' : 'border-muted'}`}
                  >
                    <PiggyBank className="mb-3 h-6 w-6" />
                    Két
                  </button>
                </div>
                 <p className="text-sm text-gray-500 mt-2">Có sẵn: {formatCurrency(sourceBalance)}</p>
              </div>

              <div className="space-y-2">
                <Label>Số tiền cần rút (VNĐ)</Label>
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
              <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-700">
                Xác nhận rút
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <Wallet className="w-4 h-4 text-blue-600" />
              Tiền mặt hiện có
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-700">{formatCurrency(currentCash)}</div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <PiggyBank className="w-4 h-4 text-purple-600" />
              Tiền trong két
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-700">{formatCurrency(safeBalance)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Lịch sử rút tiền</CardTitle></CardHeader>
        <CardContent className="p-0 sm:p-6 sm:pt-0">
          {loading ? <p className="text-center py-4">Đang tải...</p> : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Thời gian</TableHead>
                    <TableHead>Nguồn</TableHead>
                    <TableHead className="text-right">Số tiền</TableHead>
                    <TableHead>Ghi chú</TableHead>
                    <TableHead className="w-[50px]">Trạng thái</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reserves.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8">Chưa có khoản rút nào</TableCell></TableRow>
                  ) : (
                    reserves.map(record => (
                      <TableRow key={record.id} className={record.is_deleted ? 'bg-gray-100 text-gray-400' : ''}>
                        <TableCell>{new Date(record.created_at).toLocaleString('vi-VN')}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            record.source === 'CASH' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                          }`}>
                            {record.source === 'CASH' ? 'Tiền mặt' : 'Két'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(record.amount)}</TableCell>
                        <TableCell className="text-gray-500">{record.note}</TableCell>
                        <TableCell className="text-center">
                          {record.is_deleted ? (
                             <span className="text-gray-400 flex items-center justify-center gap-1 text-sm"><Ban className="w-3 h-3"/> Đã huỷ</span>
                          ) : (
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(record.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
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
