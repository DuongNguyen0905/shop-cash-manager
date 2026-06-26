'use client'

import { useState, useEffect, Suspense } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Clock, ArrowLeft, Sun, Sunset, Moon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { CalendarIcon } from 'lucide-react'
import { mockDb } from '@/lib/mock-db'
import { supabase, isMock } from '@/lib/supabase'

type Shift = {
  id: string; date: string; employee_id: string;
  start_time: string; end_time: string | null;
  cash_revenue: number; bank_revenue: number;
}
type Employee = { id: string; name: string; hourly_rate: number }

function HoursDetailContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const dateParam = searchParams.get('date') || new Date().toISOString().split('T')[0]
  const [mounted, setMounted] = useState(false)
  const [shiftsForDate, setShiftsForDate] = useState<Shift[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { 
    setMounted(true)
    fetchData()
  }, [dateParam])

  const fetchData = async () => {
    setLoading(true)
    if (isMock) {
      setShiftsForDate(mockDb.shifts.filter(s => s.date === dateParam))
      setEmployees(mockDb.employees)
      setLoading(false)
      return
    }
    try {
      const [shRes, empRes] = await Promise.all([
        supabase.from('shifts').select('*').eq('date', dateParam),
        supabase.from('employees').select('id, name, hourly_rate')
      ])
      setShiftsForDate(shRes.data || [])
      setEmployees(empRes.data || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  if (!mounted) return null

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)
  }

  const getTimeValue = (time: string) => {
    const [hour, minute] = time.split(':').map(Number)
    return hour + minute / 60
  }

  const getShiftType = (startTime: string, endTime: string | null) => {
    const start = getTimeValue(startTime)
    const end = endTime ? getTimeValue(endTime) : start
    const adjustedEnd = end < start ? end + 24 : end

    if (start < 12 && adjustedEnd > 18) return { name: 'Ca sáng + chiều + tối', icon: <Moon className="w-4 h-4 text-indigo-600" /> }
    if (start < 12 && adjustedEnd > 12) return { name: 'Ca sáng + chiều', icon: <Sun className="w-4 h-4 text-orange-500" /> }
    if (start < 18 && adjustedEnd > 18) return { name: 'Ca chiều + tối', icon: <Sunset className="w-4 h-4 text-orange-600" /> }
    if (start < 12) return { name: 'Ca sáng', icon: <Sun className="w-4 h-4 text-orange-500" /> }
    if (start < 18) return { name: 'Ca chiều', icon: <Sunset className="w-4 h-4 text-orange-600" /> }
    return { name: 'Ca tối', icon: <Moon className="w-4 h-4 text-indigo-600" /> }
  }

  const calculateHours = (start: string, end: string | null) => {
    if (!start || !end) return 0
    const [h1, m1] = start.split(':').map(Number)
    const [h2, m2] = end.split(':').map(Number)
    let diff = (h2 + m2 / 60) - (h1 + m1 / 60)
    if (diff < 0) diff += 24 // Handle overnight shifts
    return Math.round(diff * 10) / 10
  }

  let totalHours = 0
  let totalRevenue = 0

  const shiftDetails = shiftsForDate.map(shift => {
    const emp = employees.find(e => e.id === shift.employee_id)
    const hours = calculateHours(shift.start_time, shift.end_time)
    const rev = (Number(shift.cash_revenue) || 0) + (Number(shift.bank_revenue) || 0)
    const hourlyRate = Number(emp?.hourly_rate) || 0
    const salary = hours * hourlyRate
    
    totalHours += hours
    totalRevenue += rev

    return {
      id: shift.id,
      date: shift.date.split('-').reverse().join('/'),
      name: emp ? emp.name : 'Nhân viên đã xóa',
      type: getShiftType(shift.start_time, shift.end_time),
      time: `${shift.start_time} - ${shift.end_time || '...'}`,
      hours,
      hourlyRate,
      salary,
      revenue: rev
    }
  })

  // Format date to display (DD/MM/YYYY)
  const displayDate = dateParam.split('-').reverse().join('/')

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/">
          <Button variant="outline" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
              <Clock className="w-6 h-6 text-blue-600" />
              Chi tiết giờ làm
            </h2>
            <p className="text-gray-500">Thống kê ca làm việc ngày {displayDate}</p>
          </div>
          <div className="flex items-center gap-2 mt-4 sm:mt-0">
            <CalendarIcon className="w-5 h-5 text-gray-500" />
            <Input 
              type="date" 
              value={dateParam} 
              onChange={(e) => router.push(`?date=${e.target.value}`)}
              className="w-auto"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-blue-50 border-blue-100 shadow-sm">
          <CardContent className="p-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-blue-600 mb-1">Tổng giờ trong ngày</p>
                <div className="text-3xl font-bold text-blue-900">{totalHours}h</div>
              </div>
              <Clock className="w-10 h-10 text-blue-200" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-100 shadow-sm">
          <CardContent className="p-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-green-600 mb-1">Tổng doanh thu các ca</p>
                <div className="text-3xl font-bold text-green-900">{formatCurrency(totalRevenue)}</div>
              </div>
              <div className="text-green-200 text-4xl font-bold">₫</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Danh sách nhân viên làm việc</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ngày</TableHead>
                  <TableHead>Nhân viên</TableHead>
                  <TableHead>Ca làm</TableHead>
                  <TableHead>Thời gian</TableHead>
                  <TableHead className="text-right">Số giờ</TableHead>
                  <TableHead className="text-right">Tiền công</TableHead>
                  <TableHead className="text-right">Doanh thu tạo ra</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-gray-500">Đang tải...</TableCell></TableRow>
                ) : shiftDetails.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      Không có ca làm nào trong ngày này.
                    </TableCell>
                  </TableRow>
                ) : (
                  shiftDetails.map(item => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium text-gray-500">{item.date}</TableCell>
                      <TableCell className="font-bold text-gray-900">{item.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 font-medium">
                          {item.type.icon}
                          {item.type.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-600">{item.time}</TableCell>
                      <TableCell className="text-right font-bold text-blue-600">{item.hours}h</TableCell>
                      <TableCell className="text-right font-medium text-gray-700">{formatCurrency(item.salary)}</TableCell>
                      <TableCell className="text-right font-medium text-green-700">{formatCurrency(item.revenue)}</TableCell>
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

export default function HoursDetailPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">Đang tải dữ liệu...</div>}>
      <HoursDetailContent />
    </Suspense>
  )
}
