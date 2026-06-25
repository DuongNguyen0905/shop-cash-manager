'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PiggyBank, TrendingUp, CreditCard, Wallet, Calendar as CalendarIcon, Landmark, BarChart2 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Input } from '@/components/ui/input'
import { mockDb } from '@/lib/mock-db'
import { startOfWeek, addDays, format, isSameDay } from 'date-fns'
import Link from 'next/link'
import { toast } from 'sonner'

export default function DashboardPage() {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [mounted, setMounted] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [resetPin, setResetPin] = useState('')

  // New state based on transaction model
  const [currentCash, setCurrentCash] = useState(0)
  const [safeBalance, setSafeBalance] = useState(0)
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [allTransactions, setAllTransactions] = useState<any[]>([])

  useEffect(() => {
    setMounted(true)
    fetchData()
  }, [])

  const fetchData = () => {
    setCurrentCash(mockDb.getCurrentCash())
    setSafeBalance(mockDb.safe_balance)
    setTotalRevenue(mockDb.getTotalRevenue())
    setAllTransactions(mockDb.transactions)
  }

  const { stats, chartData } = useMemo(() => {
    if (!mounted) return { stats: { todayRevenue: 0, cash: 0, bank: 0 }, chartData: [] };

    const todayShifts = allTransactions.filter(tx => 
        (tx.type === 'CASH_SALE' || tx.type === 'BANK_SALE') && isSameDay(new Date(tx.timestamp), selectedDate)
    );
    
    let todayRevenue = 0, cash = 0, bank = 0;
    todayShifts.forEach(tx => {
      todayRevenue += tx.amount;
      if (tx.type === 'CASH_SALE') cash += tx.amount;
      if (tx.type === 'BANK_SALE') bank += tx.amount;
    });
    
    // Chart data for the week
    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 }); // Monday
    const weekData = Array.from({ length: 7 }).map((_, i) => {
      const day = addDays(weekStart, i);
      const dayStr = format(day, 'yyyy-MM-dd');
      const txForDay = allTransactions.filter(tx => 
        (tx.type === 'CASH_SALE' || tx.type === 'BANK_SALE') && format(new Date(tx.timestamp), 'yyyy-MM-dd') === dayStr
      );
      const cashRev = txForDay.filter(tx => tx.type === 'CASH_SALE').reduce((sum, tx) => sum + tx.amount, 0);
      const bankRev = txForDay.filter(tx => tx.type === 'BANK_SALE').reduce((sum, tx) => sum + tx.amount, 0);
      const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
      return { name: days[day.getDay()], cash: cashRev, bank: bankRev };
    });

    return {
      stats: { todayRevenue, cash, bank },
      chartData: weekData,
    };
  }, [selectedDate, mounted, allTransactions])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Dashboard</h2>
          <p className="text-gray-500">Tổng quan tình hình kinh doanh theo mô hình dòng tiền mới.</p>
        </div>
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-gray-500" />
          <Input 
            type="date" 
            value={format(selectedDate, 'yyyy-MM-dd')} 
            onChange={(e) => setSelectedDate(new Date(e.target.value))}
            className="w-auto"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="col-span-1 lg:col-span-2 bg-blue-600 text-white border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-blue-100">Tổng doanh thu (từ trước tới giờ)</CardTitle>
            <Landmark className="w-4 h-4 text-blue-100" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{formatCurrency(totalRevenue)}</div>
            <p className="text-xs text-blue-200 mt-1">Chỉ số này không bị ảnh hưởng bởi việc rút tiền hay đóng ngày.</p>
          </CardContent>
        </Card>
        
        <Card className="bg-green-600 text-white border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-green-100">Doanh thu hôm nay</CardTitle>
            <TrendingUp className="w-4 h-4 text-green-100" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(stats.todayRevenue)}</div>
            <div className="flex justify-between mt-1 text-sm text-green-100">
              <span className="flex items-center gap-1"><Wallet className="w-3 h-3" /> TM: {formatCurrency(stats.cash)}</span>
              <span className="flex items-center gap-1"><CreditCard className="w-3 h-3" /> CK: {formatCurrency(stats.bank)}</span>
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Giờ làm nhân viên</CardTitle>
            <BarChart2 className="w-4 h-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">N/A</div>
            <p className="text-xs text-gray-500 mt-1">Logic giờ làm cần được cập nhật</p>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2">
          <Link href="/closing" className="block">
            <Card className="shadow-sm hover:border-blue-300 transition-colors cursor-pointer group h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500 group-hover:text-blue-600">Tiền mặt đang giữ</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-bold text-blue-700">{formatCurrency(currentCash)}</div>
                    <p className="text-xs text-gray-500 mt-1">Click để cất vào két (đóng ngày)</p>
                </CardContent>
            </Card>
          </Link>
          <Link href="/reserve" className="block">
            <Card className="shadow-sm hover:border-purple-300 transition-colors cursor-pointer group h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500 group-hover:text-purple-600">Tiền trong két</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-bold text-purple-700">{formatCurrency(safeBalance)}</div>
                    <p className="text-xs text-gray-500 mt-1">Click để rút tiền từ két</p>
                </CardContent>
            </Card>
          </Link>
      </div>

      <Card className="shadow-sm">
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
