'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PiggyBank, TrendingUp, Clock, CreditCard, Wallet, Calendar as CalendarIcon, ChevronRight, MessageSquare } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Input } from '@/components/ui/input'
import { mockDb } from '@/lib/mock-db'
import { supabase, isMock } from '@/lib/supabase'
import { startOfWeek, addDays, format, subDays } from 'date-fns'
import Link from 'next/link'
import { requirePin } from '@/lib/auth'
import { toast } from 'sonner'

type Shift = { id: string; date: string; employee_id: string; start_time: string; end_time: string | null; cash_revenue: number; bank_revenue: number; expense: number; note: string; created_at?: string; actual_cash?: number | null; opening_cash?: number }
type Employee = { id: string; name: string }
type Reserve = { date: string; amount: number; note?: string }
type Closing = { date: string; cash_reserved: number; created_at?: string }



export default function DashboardPage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [mounted, setMounted] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [resetPin, setResetPin] = useState('')
  const [shifts, setShifts] = useState<Shift[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [reserves, setReserves] = useState<Reserve[]>([])
  const [closings, setClosings] = useState<Closing[]>([])

  useEffect(() => { 
    setMounted(true)
    fetchData()
  }, [])

  const fetchData = async () => {
    if (isMock) {
      setShifts(mockDb.shifts as Shift[])
      setEmployees(mockDb.employees)
      setReserves(mockDb.reserves)
      setClosings(mockDb.closings)
      return
    }
    try {
      const [shRes, empRes, rsvRes, clsRes] = await Promise.all([
        supabase.from('shifts').select('*'),
        supabase.from('employees').select('id, name'),
        supabase.from('cash_reserve').select('*'),
        supabase.from('closings').select('*')
      ])
      setShifts(shRes.data || [])
      setEmployees(empRes.data || [])
      setReserves(rsvRes.data || [])
      setClosings(clsRes.data || [])
    } catch (e) {
      console.error(e)
    }
  }

  const { stats, chartData, notes } = useMemo(() => {
    if (!mounted) return { stats: { todayRevenue: 0, cash: 0, bank: 0, totalHours: 0, reserveTotal: 0, reserveAdded: 0, reserveWithdrawn: 0, cashOnHand: 0 }, chartData: [], notes: [] };

    const selectedDateObj = new Date(selectedDate);
    const dayShifts = shifts.filter(s => s.date === selectedDate);
    
    let todayRevenue = 0, cash = 0, bank = 0, totalHours = 0;
    dayShifts.forEach(s => {
      const cRev = Number(s.cash_revenue) || 0;
      const bRev = Number(s.bank_revenue) || 0;
      todayRevenue += (cRev + bRev);
      cash += cRev;
      bank += bRev;
      
      if (s.start_time && s.end_time) {
        const [h1, m1] = s.start_time.split(':').map(Number);
        const [h2, m2] = s.end_time.split(':').map(Number);
        let diff = (h2 + m2 / 60) - (h1 + m1 / 60);
        if (diff < 0) diff += 24; // Handle overnight shifts
        if (diff > 0) totalHours += diff;
      }
    });

    // Safe Cash calculation (Tiền trong két)
    let reserveAdded = 0;
    let reserveWithdrawn = 0;
    let capitalAdded = 0;
    
    reserves.forEach(r => {
      if (new Date(r.date) <= selectedDateObj) {
        const amt = Number(r.amount);
        if (amt > 0) {
          reserveAdded += amt;
          if (r.note !== 'Rút cuối ngày') capitalAdded += amt;
        } else {
          reserveWithdrawn += Math.abs(amt);
        }
      }
    });

    let drawerToSafe = 0;
    closings.forEach(c => {
      if (new Date(c.date) <= selectedDateObj) drawerToSafe += Number(c.cash_reserved);
    });

    const safeCash = drawerToSafe - reserveWithdrawn; // Capital is physically in the Drawer

    // Drawer Cash calculation (Tiền trong khay)
    let drawerCash = 0;
    // Get the latest shift up to selected date
    const shiftsUpToDate = shifts.filter(s => new Date(s.date) <= selectedDateObj)
                                 .sort((a, b) => new Date(b.created_at || b.date).getTime() - new Date(a.created_at || a.date).getTime());
    
    if (shiftsUpToDate.length > 0) {
      const latestShift = shiftsUpToDate[0];
      if (latestShift.actual_cash !== null && latestShift.actual_cash !== undefined) {
        drawerCash = Number(latestShift.actual_cash);
      } else {
        drawerCash = (Number(latestShift.opening_cash) || 0) + (Number(latestShift.cash_revenue) || 0) - (Number(latestShift.expense) || 0);
      }
      
      // Prevent double counting: Subtract money withdrawn to Safe AFTER this shift was created
      const latestShiftTime = new Date(latestShift.created_at || latestShift.date).getTime();
      let recentWithdrawnToSafe = 0;
      closings.forEach(c => {
        if (new Date(c.created_at || c.date).getTime() > latestShiftTime) {
          recentWithdrawnToSafe += Number(c.cash_reserved);
        }
      });
      drawerCash -= recentWithdrawnToSafe;
    }

    let allBank = 0;
    shifts.forEach(s => {
      if (new Date(s.date) <= selectedDateObj) {
        allBank += (Number(s.bank_revenue) || 0);
      }
    });

    const cashOnHand = drawerCash + safeCash;


    // Chart data for the week
    const weekStart = startOfWeek(selectedDateObj, { weekStartsOn: 1 }); // Monday
    const weekData = Array.from({ length: 7 }).map((_, i) => {
      const d = addDays(weekStart, i);
      const dateStr = format(d, 'yyyy-MM-dd');
      const shiftsForDay = shifts.filter(s => s.date === dateStr);
      const cashRev = shiftsForDay.reduce((sum, s) => sum + (Number(s.cash_revenue)||0), 0);
      const bankRev = shiftsForDay.reduce((sum, s) => sum + (Number(s.bank_revenue)||0), 0);
      const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
      return { name: days[d.getDay()], cash: cashRev, bank: bankRev };
    });

    const dayNotes = dayShifts
      .filter(s => s.note && s.note.trim() !== '')
      .map(s => {
        const emp = employees.find(e => e.id === s.employee_id);
        return {
          id: s.id,
          time: s.start_time,
          name: emp ? emp.name : 'Không rõ',
          text: s.note
        };
      });

    return {
      stats: { todayRevenue, cash, bank, totalHours: Math.round(totalHours*10)/10, reserveTotal: 0, reserveAdded, reserveWithdrawn, cashOnHand, allBank },
      chartData: weekData,
      notes: dayNotes
    };
  }, [selectedDate, mounted, shifts, employees, reserves, closings])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Dashboard</h2>
          <p className="text-gray-500">Tổng quan tình hình kinh doanh.</p>
        </div>
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-gray-500" />
          <Input 
            type="date" 
            value={selectedDate} 
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-auto"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="bg-green-600 text-white border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-green-100">Doanh thu hôm nay</CardTitle>
            <TrendingUp className="w-4 h-4 text-green-100" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(stats.todayRevenue)}</div>
            <div className="flex justify-between mt-4 text-sm text-green-100">
              <span className="flex items-center gap-1"><Wallet className="w-3 h-3" /> TM: {formatCurrency(stats.cash)}</span>
              <span className="flex items-center gap-1"><CreditCard className="w-3 h-3" /> CK: {formatCurrency(stats.bank)}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Tiền mặt đang giữ</CardTitle>
            <Wallet className="w-4 h-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{formatCurrency(stats.cashOnHand)}</div>
            <p className="text-xs text-gray-500 mt-1">Sẵn sàng để giao ca / đóng ngày</p>
          </CardContent>
        </Card>

        <Link href="/reserve" className="block">
          <Card className="shadow-sm hover:border-purple-300 transition-colors cursor-pointer group h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500 group-hover:text-purple-600 transition-colors">Quỹ tách riêng</CardTitle>
              <PiggyBank className="w-4 h-4 text-gray-400 group-hover:text-purple-500 transition-colors" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="w-full">
                  <div className="flex justify-between items-end mb-1">
                    <span className="text-xs text-gray-500">Nộp vào:</span>
                    <span className="font-semibold text-green-600">{formatCurrency(stats.reserveAdded)}</span>
                  </div>
                  <div className="flex justify-between items-end">
                    <span className="text-xs text-gray-500">Rút ra:</span>
                    <span className="font-semibold text-red-500">{formatCurrency(stats.reserveWithdrawn)}</span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-purple-400 ml-2" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href={`/hours-detail?date=${selectedDate}`} className="block">
          <Card className="shadow-sm hover:border-blue-300 transition-colors cursor-pointer group h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500 group-hover:text-blue-600 transition-colors">Giờ làm nhân viên</CardTitle>
              <Clock className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-gray-900 group-hover:text-blue-700 transition-colors">{stats.totalHours}h</div>
                  <p className="text-xs text-gray-500 mt-1">Xem chi tiết giờ làm hôm nay</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-blue-400" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-1 md:col-span-2 lg:col-span-5 shadow-sm">
          <CardHeader>
            <CardTitle>Biểu đồ doanh thu (Tuần)</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tickFormatter={(value) => `${value / 1000000}tr`}
                />
                <Tooltip 
                  formatter={(value: any, name: any) => [formatCurrency(Number(value)), name === 'cash' ? 'Tiền mặt' : 'Chuyển khoản']}
                  cursor={{fill: 'rgba(0, 0, 0, 0.05)'}}
                />
                <Bar dataKey="cash" stackId="a" fill="#16a34a" radius={[0, 0, 0, 0]} />
                <Bar dataKey="bank" stackId="a" fill="#9333ea" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="col-span-1 md:col-span-2 lg:col-span-2 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Ghi chú trong ngày
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] overflow-y-auto space-y-4">
            {notes.length === 0 ? (
              <p className="text-gray-500 text-sm italic">Không có ghi chú nào.</p>
            ) : (
              notes.map(note => (
                <div key={note.id} className="bg-orange-50 border-l-4 border-orange-400 p-3 rounded-r-md">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-semibold text-gray-900 text-sm">{note.name}</span>
                    <span className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded-full border">{note.time}</span>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{note.text}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end pt-8">
        {!showResetConfirm ? (
          <Button variant="destructive" onClick={() => setShowResetConfirm(true)}>
            Xóa toàn bộ dữ liệu (Làm mới)
          </Button>
        ) : (
          <div className="flex items-center gap-2 bg-red-50 p-2 rounded-md border border-red-200">
            <span className="text-sm text-red-600 font-medium">Nhập mã PIN để xóa:</span>
            <Input 
              type="password" 
              value={resetPin} 
              onChange={e => setResetPin(e.target.value)} 
              className="w-32 h-8" 
              placeholder="Mã PIN"
            />
            <Button variant="destructive" size="sm" onClick={() => {
              if (resetPin === 'Tiemgiat201') {
                mockDb.clearAll();
                window.location.reload();
              } else {
                toast.error('Mã PIN không đúng!');
              }
            }}>Xác nhận xóa</Button>
            <Button variant="ghost" size="sm" onClick={() => { setShowResetConfirm(false); setResetPin(''); }}>Hủy</Button>
          </div>
        )}
      </div>
    </div>
  )
}
