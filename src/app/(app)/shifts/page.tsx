'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog'
import { CalendarIcon, Clock, Plus, AlertTriangle, CheckCircle, Trash2, History } from 'lucide-react'
import { PinDialog } from '@/components/PinDialog'
import { toast } from 'sonner'
import { supabase, isMock } from '@/lib/supabase'
import { mockDb } from '@/lib/mock-db'
import { CurrencyInput } from '@/components/ui/currency-input'
import { TimeInput } from '@/components/ui/time-input'
import Link from 'next/link'

type Employee = { id: string; name: string; is_deleted?: boolean }

type Shift = {
  id: string
  date: string
  employee_id: string
  employee?: { name: string }
  start_time: string
  end_time: string | null
  opening_cash: number
  cash_revenue: number
  bank_revenue: number
  expense: number
  expected_cash?: number
  actual_cash: number | null
  difference?: number
  note: string
}



export default function ShiftsPage() {
  const [shifts, setShifts] = useState<Shift[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null)
  const [pinDialogOpen, setPinDialogOpen] = useState(false)
  const [pinDialogAction, setPinDialogAction] = useState<{action: 'delete' | 'edit', id: string, shift?: Shift} | null>(null)

  // Form
  const [shiftDate, setShiftDate] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [openingCash, setOpeningCash] = useState('0')
  const [cashRevenue, setCashRevenue] = useState('0')
  const [bankRevenue, setBankRevenue] = useState('0')
  const [expense, setExpense] = useState('0')
  const [actualCash, setActualCash] = useState('')
  const [note, setNote] = useState('')

  const fetchData = async () => {
    setLoading(true)
    if (isMock) {
      setShifts([...mockDb.shifts].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()))
      setEmployees([...mockDb.employees])
      setLoading(false)
      return
    }

    try {
      const [shiftsRes, empRes] = await Promise.all([
        supabase.from('shifts').select('*, employee:employees(name)').order('created_at', { ascending: false }),
        supabase.from('employees').select('id, name')
      ])
      
      if (shiftsRes.error) throw shiftsRes.error
      if (empRes.error) throw empRes.error

      setShifts(shiftsRes.data || [])
      setEmployees(empRes.data || [])
    } catch (error: any) {
      toast.error('Lỗi khi tải dữ liệu: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleOpenNew = () => {
    setEditingShiftId(null)
    setShiftDate(new Date().toISOString().split('T')[0])
    setEmployeeId('')
    setStartTime('')
    setEndTime('')
    setOpeningCash('')
    setCashRevenue('')
    setBankRevenue('')
    setExpense('')
    setActualCash('')
    setNote('')
    setIsOpen(true)
  }

  const handleOpenEdit = (shift: Shift) => {
    setPinDialogAction({ action: 'edit', id: shift.id, shift })
    setPinDialogOpen(true)
  }

  const executeOpenEdit = (shift: Shift) => {
    setEditingShiftId(shift.id)
    setShiftDate(shift.date)
    setEmployeeId(shift.employee_id)
    setStartTime(shift.start_time)
    setEndTime(shift.end_time || '')
    setOpeningCash(shift.opening_cash.toString())
    setCashRevenue(shift.cash_revenue.toString())
    setBankRevenue(shift.bank_revenue.toString())
    setExpense(shift.expense.toString())
    setActualCash(shift.actual_cash !== null ? shift.actual_cash.toString() : '')
    setNote(shift.note || '')
    setIsOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!employeeId || !startTime) return

    const oCash = Number(openingCash) || 0
    const cRev = Number(cashRevenue) || 0
    const exp = Number(expense) || 0
    const bRev = Number(bankRevenue) || 0
    const aCash = actualCash ? Number(actualCash) : null
    const eCash = oCash + cRev - exp
    const diff = aCash !== null ? aCash - eCash : undefined

    if (isMock) {
      if (editingShiftId) {
        mockDb.updateShift(editingShiftId, {
          employee_id: employeeId,
          start_time: startTime,
          end_time: endTime || null,
          opening_cash: oCash,
          cash_revenue: cRev,
          bank_revenue: bRev,
          expense: exp,
          actual_cash: aCash !== null ? aCash : null,
          note
        })
        toast.success('Cập nhật ca thành công')
      } else {
        mockDb.addShift({
          date: shiftDate || new Date().toISOString().split('T')[0],
          employee_id: employeeId,
          start_time: startTime,
          end_time: endTime || null,
          opening_cash: oCash,
          cash_revenue: cRev,
          bank_revenue: bRev,
          expense: exp,
          actual_cash: aCash !== null ? aCash : null,
          note
        })
        toast.success('Lưu ca thành công')
      }
      setIsOpen(false)
      fetchData()
      return
    }

    try {
      const shiftData = {
        date: shiftDate || new Date().toISOString().split('T')[0],
        employee_id: employeeId,
        start_time: startTime,
        end_time: endTime || null,
        opening_cash: oCash,
        cash_revenue: cRev,
        bank_revenue: bRev,
        expense: exp,
        actual_cash: aCash,
        note
      }

      if (editingShiftId) {
        const { error } = await supabase.from('shifts').update(shiftData).eq('id', editingShiftId)
        if (error) throw error
        toast.success('Cập nhật ca thành công')
      } else {
        const { error } = await supabase.from('shifts').insert([shiftData])
        if (error) throw error
        toast.success('Lưu ca thành công')
      }
      setIsOpen(false)
      fetchData()
    } catch (error: any) {
      toast.error('Lỗi: ' + error.message)
    }
  }

  const handleDelete = (id: string) => {
    setPinDialogAction({ action: 'delete', id })
    setPinDialogOpen(true)
  }

  const executeDelete = async (id: string) => {
      if (isMock) {
        mockDb.deleteShift(id)
        toast.success('Đã xóa ca làm')
        fetchData()
        return
      }
      try {
        const { error } = await supabase.from('shifts').delete().eq('id', id)
        if (error) throw error
        toast.success('Đã xóa ca làm')
        fetchData()
      } catch (error: any) {
        toast.error('Lỗi khi xóa: ' + error.message)
      }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)
  }

  const renderStatus = (diff?: number) => {
    if (diff === undefined) return <span className="text-gray-400">Chưa chốt</span>
    if (diff === 0) return <span className="text-green-600 flex items-center gap-1"><CheckCircle className="w-4 h-4"/> Đúng</span>
    if (diff < 0) return <span className="text-red-600 flex items-center gap-1"><AlertTriangle className="w-4 h-4"/> Thiếu {formatCurrency(Math.abs(diff))}</span>
    return <span className="text-blue-600 flex items-center gap-1"><AlertTriangle className="w-4 h-4"/> Dư {formatCurrency(diff)}</span>
  }

  const getEmployeeNameById = (id: string) => {
    return employees.find(e => e.id === id)?.name
      || mockDb.employees.find(e => e.id === id)?.name
      || ''
  }

  const getShiftEmployeeName = (shift: Shift) => {
    return shift.employee?.name
      || getEmployeeNameById(shift.employee_id)
      || 'Không rõ nhân viên'
  }

  // Calculated Expected Cash for Form Preview
  const expectedCashPreview = (Number(openingCash) || 0) + (Number(cashRevenue) || 0) - (Number(expense) || 0)

  return (
    <div className="space-y-6">
      <PinDialog 
        isOpen={pinDialogOpen} 
        onOpenChange={setPinDialogOpen}
        title={pinDialogAction?.action === 'delete' ? 'Xác nhận xóa' : 'Xác nhận sửa'}
        description={pinDialogAction?.action === 'delete' ? 'Nhập mã PIN để xóa ca làm này.' : 'Nhập mã PIN để sửa ca làm này.'}
        onConfirm={() => {
          if (pinDialogAction?.action === 'delete') {
            executeDelete(pinDialogAction.id)
          } else if (pinDialogAction?.action === 'edit' && pinDialogAction.shift) {
            executeOpenEdit(pinDialogAction.shift)
          }
        }}
      />
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <Clock className="w-6 h-6 text-green-600" />
            Quản lý ca
          </h2>
          <p className="text-gray-500">Ghi nhận thông tin ca làm việc và đối soát tiền mặt.</p>
        </div>
        
        <div className="flex gap-2">
          <Link href="/audits">
            <Button variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-100">
              <History className="w-4 h-4 mr-2" />
              Lịch sử sửa
            </Button>
          </Link>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <Button className="bg-green-600 hover:bg-green-700" onClick={handleOpenNew}>
              <Plus className="w-4 h-4 mr-2" />
              Thêm ca làm
            </Button>
          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingShiftId ? 'Sửa ca / Chốt ca' : 'Nhập ca mới'}</DialogTitle>
              <DialogDescription>
                Điền thông tin doanh thu và chi phí ca làm việc.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Ngày làm việc</Label>
                  <Input type="date" value={shiftDate} onChange={e => setShiftDate(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Nhân viên</Label>
                  <Select value={employeeId} onValueChange={(val) => setEmployeeId(val || '')} required>
                    <SelectTrigger className="w-full">
                      {employeeId ? getEmployeeNameById(employeeId) || 'Không rõ nhân viên' : <SelectValue placeholder="Chọn nhân viên..." />}
                    </SelectTrigger>
                    <SelectContent>
                      {employees.filter(e => !e.is_deleted || e.id === employeeId).map(e => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.name} {e.is_deleted ? '(Đã xóa)' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Giờ vào (24h)</Label>
                  <TimeInput value={startTime} onChangeValue={setStartTime} required />
                </div>
                <div className="space-y-2">
                  <Label>Giờ ra (Tuỳ chọn)</Label>
                  <TimeInput value={endTime} onChangeValue={setEndTime} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tiền đầu ca (TM)</Label>
                <CurrencyInput value={openingCash} onChangeValue={setOpeningCash} required />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Doanh thu TM</Label>
                  <CurrencyInput value={cashRevenue} onChangeValue={setCashRevenue} required />
                </div>
                <div className="space-y-2">
                  <Label>Doanh thu CK</Label>
                  <CurrencyInput value={bankRevenue} onChangeValue={setBankRevenue} required />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Chi phí phát sinh (TM)</Label>
                <CurrencyInput value={expense} onChangeValue={setExpense} />
              </div>

              <div className="bg-gray-100 p-3 rounded-md text-sm">
                <div className="flex justify-between font-medium">
                  <span>Tiền kỳ vọng cuối ca:</span>
                  <span className="text-green-700">{formatCurrency(expectedCashPreview)}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">= Đầu ca + Doanh thu TM - Chi phí</p>
              </div>

              <div className="space-y-2">
                <Label className="text-green-700 font-bold">Tiền đếm thực tế cuối ca</Label>
                <CurrencyInput value={actualCash} onChangeValue={setActualCash} placeholder="Để trống nếu chưa chốt" />
              </div>

              <div className="space-y-2">
                <Label>Ghi chú</Label>
                <Input value={note} onChange={e => setNote(e.target.value)} placeholder="Nhập ghi chú..." />
              </div>

              <Button type="submit" className="w-full bg-green-600 hover:bg-green-700">Lưu ca làm</Button>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-8 text-gray-500">Đang tải...</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ngày</TableHead>
                    <TableHead>Nhân viên</TableHead>
                    <TableHead>Giờ làm</TableHead>
                    <TableHead className="text-right">Kỳ vọng</TableHead>
                    <TableHead className="text-right">Thực tế</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shifts.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8">Chưa có ca làm nào</TableCell></TableRow>
                  ) : (
                    shifts.map(shift => {
                      const expCash = shift.expected_cash || ((Number(shift.opening_cash)||0) + (Number(shift.cash_revenue)||0) - (Number(shift.expense)||0));
                      return (
                      <TableRow key={shift.id}>
                        <TableCell>{shift.date}</TableCell>
                        <TableCell className="font-medium">
                          {getShiftEmployeeName(shift)}
                        </TableCell>
                        <TableCell>{shift.start_time} - {shift.end_time || '...'}</TableCell>
                        <TableCell className="text-right font-medium text-gray-600">
                          {formatCurrency(expCash)}
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {shift.actual_cash !== null ? (
                            <div className="flex flex-col items-end">
                              <span className="font-bold text-gray-900">{formatCurrency(shift.actual_cash)}</span>
                            </div>
                          ) : (
                            <span className="text-orange-500 text-sm font-medium italic">Chưa chốt</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {shift.actual_cash !== null ? renderStatus(shift.actual_cash - expCash) : renderStatus(undefined)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(shift)} className="text-blue-600 hover:bg-blue-50 mr-2">
                            Sửa
                          </Button>
                          {shift.actual_cash === null && (
                            <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(shift)} className="text-blue-600 hover:bg-blue-50 mr-2 font-semibold">
                              Chốt ca
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(shift.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )})
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
