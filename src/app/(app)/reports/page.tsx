'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { FileText, ArrowRight } from 'lucide-react'
import { mockDb } from '@/lib/mock-db'
import { Badge } from '@/components/ui/badge'

type Transaction = {
  id: string;
  timestamp: string;
  type: 'CASH_SALE' | 'BANK_SALE' | 'EXPENSE' | 'CLOSING_TRANSFER' | 'WITHDRAWAL' | 'REFUND_WITHDRAWAL' | 'INITIAL_CASH' | 'ADJUSTMENT';
  amount: number;
  description: string;
  source?: 'CASH' | 'SAFE' | 'BANK' | 'EXTERNAL';
  destination?: 'CASH' | 'SAFE' | 'BANK' | 'EXTERNAL';
  related_id?: string;
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)
}

const TransactionTypeBadge = ({ type }: { type: Transaction['type'] }) => {
  const typeMap: Record<Transaction['type'], { label: string, className: string }> = {
    'CASH_SALE': { label: 'Bán (TM)', className: 'bg-green-100 text-green-800' },
    'BANK_SALE': { label: 'Bán (CK)', className: 'bg-blue-100 text-blue-800' },
    'EXPENSE': { label: 'Chi phí', className: 'bg-red-100 text-red-800' },
    'CLOSING_TRANSFER': { label: 'Cất vào két', className: 'bg-yellow-100 text-yellow-800' },
    'WITHDRAWAL': { label: 'Rút tiền', className: 'bg-orange-100 text-orange-800' },
    'REFUND_WITHDRAWAL': { label: 'Hoàn tiền rút', className: 'bg-pink-100 text-pink-800' },
    'INITIAL_CASH': { label: 'Vốn ban đầu', className: 'bg-gray-100 text-gray-800' },
    'ADJUSTMENT': { label: 'Điều chỉnh', className: 'bg-purple-100 text-purple-800' },
  }
  const { label, className } = typeMap[type] || { label: 'Không rõ', className: 'bg-gray-100' }
  return <Badge variant="outline" className={className}>{label}</Badge>
}

const FundMovement = ({ source, destination }: { source?: Transaction['source'], destination?: Transaction['destination']}) => {
    const fundMap: Record<string, { label: string, className: string }> = {
      'CASH': { label: 'Tiền mặt', className: 'text-blue-600' },
      'SAFE': { label: 'Két', className: 'text-purple-600' },
      'BANK': { label: 'Ngân hàng', className: 'text-cyan-600' },
      'EXTERNAL': { label: 'Ngoài', className: 'text-gray-500' },
    }
    
    if (!source && !destination) return <span className="text-gray-400">-</span>
    
    const src = source ? fundMap[source] : null
    const dest = destination ? fundMap[destination] : null

    return (
        <div className="flex items-center gap-2 text-sm">
            {src && <span className={src.className}>{src.label}</span>}
            {src && dest && <ArrowRight className="w-3 h-3 text-gray-400" />}
            {dest && <span className={dest.className}>{dest.label}</span>}
        </div>
    )
}


export default function ReportsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    // Ensure transactions are sorted by time, newest first
    setTransactions(mockDb.transactions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()))
    setLoading(false)
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
          <FileText className="w-6 h-6 text-green-600" />
          Lịch sử Dòng tiền
        </h2>
        <p className="text-gray-500">Toàn bộ lịch sử các giao dịch tiền tệ đã được ghi nhận.</p>
      </div>

      <Card>
        <CardContent className="p-0 sm:p-6 sm:pt-0">
          {loading ? (
            <div className="text-center py-8 text-gray-500">Đang tải...</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Thời gian</TableHead>
                    <TableHead>Loại</TableHead>
                    <TableHead>Mô tả</TableHead>
                    <TableHead>Dòng tiền</TableHead>
                    <TableHead className="text-right">Số tiền</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8">Chưa có giao dịch nào</TableCell></TableRow>
                  ) : (
                    transactions.map(tx => (
                      <TableRow key={tx.id}>
                        <TableCell className="text-xs text-gray-500">{new Date(tx.timestamp).toLocaleString('vi-VN')}</TableCell>
                        <TableCell><TransactionTypeBadge type={tx.type} /></TableCell>
                        <TableCell className="text-sm">{tx.description}</TableCell>
                        <TableCell><FundMovement source={tx.source} destination={tx.destination} /></TableCell>
                        <TableCell className={`text-right font-medium ${tx.source === 'CASH' || tx.source === 'SAFE' ? 'text-red-600' : 'text-green-700'}`}>
                           {tx.source ? '-' : '+'}{formatCurrency(tx.amount)}
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
