'use client'

import { useRef, useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FileText, Printer, Calendar as CalendarIcon } from 'lucide-react'
import { useReactToPrint } from 'react-to-print'
import { Input } from '@/components/ui/input'
import { mockDb } from '@/lib/mock-db'
import { supabase, isMock } from '@/lib/supabase'
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns'

type Shift = {
  employee_id: string; date: string;
  start_time: string; end_time: string | null;
  cash_revenue: number; bank_revenue: number; expense: number;
}
type Employee = { id: string; name: string; hourly_rate: number }
type Reserve = { date: string; amount: number }

export default function ReportsPage() {
  const componentRef = useRef<HTMLDivElement>(null)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [activeTab, setActiveTab] = useState('weekly')
  const [mounted, setMounted] = useState(false)
  const [shifts, setShifts] = useState<Shift[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [reserves, setReserves] = useState<Reserve[]>([])

  useEffect(() => { 
    setMounted(true)
    fetchData()
  }, [])

  const fetchData = async () => {
    if (isMock) {
      setShifts(mockDb.shifts)
      setEmployees(mockDb.employees)
      setReserves(mockDb.reserves)
      return
    }
    try {
      const [shRes, empRes, rsvRes] = await Promise.all([
        supabase.from('shifts').select('*'),
        supabase.from('employees').select('*'),
        supabase.from('cash_reserve').select('*')
      ])
      setShifts(shRes.data || [])
      setEmployees(empRes.data || [])
      setReserves(rsvRes.data || [])
    } catch (e) {
      console.error(e)
    }
  }

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: 'Bao_Cao_Tiem',
  })

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)
  }

  // Dynamic Data
  const reportData = useMemo(() => {
    if (!mounted) {
      return {
        weekly: { revenueTotal: 0, revenueCash: 0, revenueBank: 0, expense: 0, hoursWorked: 0, salary: 0, reserved: 0 },
        monthly: { revenueTotal: 0, revenueCash: 0, revenueBank: 0, expense: 0, hoursWorked: 0, salary: 0, reserved: 0 }
      }
    }

    const d = new Date(selectedDate);
    const wStart = startOfWeek(d, { weekStartsOn: 1 });
    const wEnd = endOfWeek(d, { weekStartsOn: 1 });
    const mStart = startOfMonth(d);
    const mEnd = endOfMonth(d);

    const calcStats = (start: Date, end: Date) => {
      let revenueCash = 0, revenueBank = 0, expense = 0, hoursWorked = 0, salary = 0;
      const empMap: Record<string, { name: string; shifts: number; hours: number; salary: number; hourlyRate: number }> = {};

      shifts.forEach(s => {
        const sd = new Date(s.date);
        if (isWithinInterval(sd, { start, end })) {
          revenueCash += Number(s.cash_revenue) || 0;
          revenueBank += Number(s.bank_revenue) || 0;
          expense += Number(s.expense) || 0;
          
          let h = 0;
          if (s.start_time && s.end_time) {
            const [h1, m1] = s.start_time.split(':').map(Number);
            const [h2, m2] = s.end_time.split(':').map(Number);
            h = (h2 + m2 / 60) - (h1 + m1 / 60);
            if (h < 0) h += 24; // Handle overnight shifts
            if (h > 0) {
              hoursWorked += h;
              const emp = employees.find(e => e.id === s.employee_id);
              const empName = emp ? emp.name : 'Nhân viên đã xóa';
              const empRate = emp ? emp.hourly_rate : 0;
              const empSalary = h * empRate;
              
              salary += empSalary;
              
              if (!empMap[s.employee_id]) {
                empMap[s.employee_id] = { name: empName, shifts: 0, hours: 0, salary: 0, hourlyRate: empRate };
              }
              empMap[s.employee_id].shifts += 1;
              empMap[s.employee_id].hours += h;
              empMap[s.employee_id].salary += empSalary;
            }
          }
        }
      });

      let reserved = 0;
      reserves.forEach(r => {
        const rd = new Date(r.date);
        if (isWithinInterval(rd, { start, end })) {
          reserved += Number(r.amount);
        }
      });

      return {
        revenueTotal: revenueCash + revenueBank,
        revenueCash,
        revenueBank,
        expense,
        hoursWorked: Math.round(hoursWorked * 10) / 10,
        salary,
        reserved,
        employeeBreakdown: Object.values(empMap)
      }
    };

    return {
      weekly: calcStats(wStart, wEnd),
      monthly: calcStats(mStart, mEnd)
    }
  }, [selectedDate, mounted, shifts, employees, reserves])

  const ReportContent = ({ data, title, period }: { data: any, title: string, period: string }) => (
    <div className="space-y-6" ref={componentRef}>
      <div className="text-center pb-4 border-b">
        <h2 className="text-2xl font-bold uppercase text-gray-900">{title}</h2>
        <p className="text-gray-500 mt-1">Kỳ báo cáo: {period}</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <p className="text-sm text-gray-500">Tổng doanh thu</p>
          <p className="text-2xl font-bold text-green-700">{formatCurrency(data.revenueTotal)}</p>
        </div>
        <div className="space-y-2 text-right">
          <p className="text-sm text-gray-500">Tổng chi phí</p>
          <p className="text-2xl font-bold text-red-600">{formatCurrency(data.expense)}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
        <div>
          <p className="text-sm text-gray-500">Tiền mặt (TM)</p>
          <p className="font-semibold text-gray-900">{formatCurrency(data.revenueCash)}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Chuyển khoản (CK)</p>
          <p className="font-semibold text-gray-900">{formatCurrency(data.revenueBank)}</p>
        </div>
      </div>

      <div className="pt-4 border-t space-y-4">
        <h3 className="font-semibold text-gray-900">Chi phí nhân sự</h3>
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Tổng giờ làm việc:</span>
          <span className="font-medium">{data.hoursWorked} giờ</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Tổng lương chi trả:</span>
          <span className="font-medium text-gray-900">{formatCurrency(data.salary)}</span>
        </div>
        {data.employeeBreakdown && data.employeeBreakdown.length > 0 && (
          <div className="mt-4 border rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">Nhân viên</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-500">Số ca</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-500">Mức lương</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-500">Số giờ</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-500">Thành tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.employeeBreakdown.map((emp: any, idx: number) => (
                  <tr key={idx}>
                    <td className="px-3 py-2 font-medium">{emp.name}</td>
                    <td className="px-3 py-2 text-right text-gray-600">{emp.shifts}</td>
                    <td className="px-3 py-2 text-right text-gray-600">{formatCurrency(emp.hourlyRate)}/h</td>
                    <td className="px-3 py-2 text-right text-gray-600">{Math.round(emp.hours * 10) / 10}</td>
                    <td className="px-3 py-2 text-right text-green-700 font-medium">{formatCurrency(emp.salary)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="pt-4 border-t space-y-4">
        <h3 className="font-semibold text-gray-900">Quỹ & Tồn dư</h3>
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Tổng tiền đã rút về quỹ:</span>
          <span className="font-medium text-blue-600">{formatCurrency(data.reserved)}</span>
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-green-600" />
            Báo cáo
          </h2>
          <p className="text-gray-500">Xem và xuất báo cáo doanh thu, chi phí.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-2">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-gray-500" />
            {activeTab === 'monthly' ? (
              <Input 
                type="month" 
                value={selectedDate.substring(0, 7)} 
                onChange={(e) => setSelectedDate(e.target.value + '-01')}
                className="w-auto"
              />
            ) : (
              <Input 
                type="date" 
                value={selectedDate} 
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-auto"
              />
            )}
          </div>
          <Button onClick={handlePrint} className="bg-gray-900 hover:bg-gray-800">
            <Printer className="w-4 h-4 mr-2" />
            Xuất PDF (In)
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="weekly">Báo cáo Tuần</TabsTrigger>
              <TabsTrigger value="monthly">Báo cáo Tháng</TabsTrigger>
            </TabsList>
            <TabsContent value="weekly">
              <ReportContent data={reportData.weekly} title="Báo cáo Doanh thu Tuần" period="Tuần này" />
            </TabsContent>
            <TabsContent value="monthly">
              <ReportContent data={reportData.monthly} title="Báo cáo Doanh thu Tháng" period="Tháng này" />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
