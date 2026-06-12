'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { History, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { mockDb } from '@/lib/mock-db'
import { format } from 'date-fns'

export default function AuditsPage() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  if (!mounted) return null

  const audits = mockDb.audits || []

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)
  }

  const formatChanges = (oldData: any, newData: any) => {
    const changes: string[] = []
    
    // Check keys that usually change
    const keysToCheck = [
      { key: 'start_time', label: 'Giờ vào' },
      { key: 'end_time', label: 'Giờ ra' },
      { key: 'opening_cash', label: 'Tiền đầu ca', isCurrency: true },
      { key: 'cash_revenue', label: 'Doanh thu TM', isCurrency: true },
      { key: 'bank_revenue', label: 'Doanh thu CK', isCurrency: true },
      { key: 'expense', label: 'Chi phí', isCurrency: true },
      { key: 'actual_cash', label: 'Tiền đếm thực tế', isCurrency: true },
      { key: 'note', label: 'Ghi chú' }
    ]

    keysToCheck.forEach(({ key, label, isCurrency }) => {
      if (newData[key] !== undefined && oldData[key] !== newData[key]) {
        let oldVal = oldData[key]
        let newVal = newData[key]
        
        if (isCurrency) {
          oldVal = oldVal !== null && oldVal !== undefined ? formatCurrency(oldVal) : 'Trống'
          newVal = newVal !== null && newVal !== undefined ? formatCurrency(newVal) : 'Trống'
        } else {
          oldVal = oldVal || 'Trống'
          newVal = newVal || 'Trống'
        }
        
        changes.push(`${label}: ${oldVal} ➡️ ${newVal}`)
      }
    })

    if (changes.length === 0) return 'Cập nhật nhưng không đổi dữ liệu'
    return changes.join(' | ')
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/shifts">
          <Button variant="outline" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <History className="w-6 h-6 text-gray-600" />
            Lịch sử chỉnh sửa ca làm
          </h2>
          <p className="text-gray-500">Xem lại những thay đổi dữ liệu của các ca làm việc.</p>
        </div>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Nhật ký hoạt động</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Thời gian sửa</TableHead>
                  <TableHead className="w-[180px]">Ca làm bị sửa (Ngày)</TableHead>
                  <TableHead>Chi tiết thay đổi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {audits.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-gray-500">
                      Chưa có lịch sử chỉnh sửa nào.
                    </TableCell>
                  </TableRow>
                ) : (
                  audits.map(audit => {
                    const shift = mockDb.shifts.find(s => s.id === audit.shift_id) || audit.old_data
                    return (
                      <TableRow key={audit.id}>
                        <TableCell className="font-medium text-gray-600">
                          {format(new Date(audit.timestamp), 'HH:mm dd/MM/yyyy')}
                        </TableCell>
                        <TableCell className="font-bold text-gray-900">
                          {shift?.date ? shift.date.split('-').reverse().join('/') : 'Không rõ'}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1 text-sm">
                            {formatChanges(audit.old_data, audit.new_data).split(' | ').map((change, idx) => (
                              <span key={idx} className="bg-gray-100 px-2 py-1 rounded-md text-gray-700">
                                {change}
                              </span>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
