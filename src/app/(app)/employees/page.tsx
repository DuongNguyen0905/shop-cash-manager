'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Plus, Users, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { supabase, isMock } from '@/lib/supabase'
import { mockDb } from '@/lib/mock-db'
import { CurrencyInput } from '@/components/ui/currency-input'
import { PinDialog } from '@/components/PinDialog'

type Employee = {
  id: string
  name: string
  hourly_rate: number
  is_deleted?: boolean
}



export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [pinDialogOpen, setPinDialogOpen] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  // Form state
  const [name, setName] = useState('')
  const [hourlyRate, setHourlyRate] = useState('')

  const fetchEmployees = async () => {
    setLoading(true)
    if (isMock) {
      setEmployees([...mockDb.employees]
        .filter(e => !e.is_deleted)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()))
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase.from('employees').select('*').order('created_at', { ascending: false })
      if (error) throw error
      setEmployees(data || [])
    } catch (error: any) {
      toast.error('Lỗi khi tải danh sách nhân viên: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEmployees()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !hourlyRate) return

    if (isMock) {
      mockDb.addEmployee({
        name,
        hourly_rate: Number(hourlyRate),
      })
      toast.success('Thêm nhân viên thành công')
      setIsOpen(false)
      fetchEmployees()
      setName('')
      setHourlyRate('')
      return
    }

    try {
      const { error } = await supabase.from('employees').insert([
        { name, hourly_rate: Number(hourlyRate) }
      ])
      if (error) throw error
      toast.success('Thêm nhân viên thành công')
      setIsOpen(false)
      fetchEmployees()
      setName('')
      setHourlyRate('')
    } catch (error: any) {
      toast.error('Lỗi khi thêm: ' + error.message)
    }
  }

  const handleDelete = (id: string) => {
    setPendingDeleteId(id)
    setPinDialogOpen(true)
  }

  const executeDelete = async (id: string) => {
      if (isMock) {
        mockDb.deleteEmployee(id)
        toast.success('Đã xóa nhân viên')
        fetchEmployees()
        return
      }
      try {
        const { error } = await supabase.from('employees').delete().eq('id', id)
        if (error) throw error
        toast.success('Đã xóa nhân viên')
        fetchEmployees()
      } catch (error: any) {
        toast.error('Lỗi khi xóa: ' + error.message)
      }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)
  }

  return (
    <div className="space-y-6">
      <PinDialog 
        isOpen={pinDialogOpen} 
        onOpenChange={setPinDialogOpen}
        title="Xác nhận xóa"
        description="Nhập mã PIN để xóa nhân viên này. Lịch sử ca làm sẽ vẫn được giữ lại."
        onConfirm={() => pendingDeleteId && executeDelete(pendingDeleteId)}
      />
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-green-600" />
            Nhân viên
          </h2>
          <p className="text-gray-500">Quản lý danh sách nhân viên và mức lương.</p>
        </div>
        
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger render={
            <Button className="bg-green-600 hover:bg-green-700">
              <Plus className="w-4 h-4 mr-2" />
              Thêm nhân viên
            </Button>
          } />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Thêm nhân viên mới</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Tên nhân viên</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nhập tên..."
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rate">Lương theo giờ (VNĐ)</Label>
                <CurrencyInput
                  id="rate"
                  value={hourlyRate}
                  onChangeValue={setHourlyRate}
                  placeholder="Ví dụ: 25.000"
                  required
                />
              </div>
              <Button type="submit" className="w-full bg-green-600 hover:bg-green-700">
                Lưu nhân viên
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Danh sách</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tên nhân viên</TableHead>
                  <TableHead className="text-right">Mức lương / Giờ</TableHead>
                  <TableHead className="text-right w-[100px]">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-gray-500">Đang tải...</TableCell>
                  </TableRow>
                ) : employees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-gray-500">Chưa có nhân viên nào</TableCell>
                  </TableRow>
                ) : (
                  employees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell className="font-medium">{employee.name}</TableCell>
                      <TableCell className="text-right text-gray-600">{formatCurrency(employee.hourly_rate)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(employee.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
