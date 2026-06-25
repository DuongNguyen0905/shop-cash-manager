type Employee = { id: string; name: string; hourly_rate: number; created_at: string; is_deleted?: boolean };
type Shift = {
  id: string; date: string; employee_id: string; start_time: string; end_time: string | null;
  opening_cash: number; cash_revenue: number; bank_revenue: number; expense: number;
  actual_cash: number | null; note: string; created_at: string;
};
type Reserve = { id: string; date: string; amount: number; note: string; created_at: string; source?: 'CASH' | 'SAFE', is_deleted?: boolean };
type Closing = { id: string; date: string; cash_total: number; cash_reserved: number; created_at: string };
type ShiftAudit = { id: string; shift_id: string; timestamp: string; old_data: Partial<Shift>; new_data: Partial<Shift> };
type Transaction = {
  id: string;
  timestamp: string;
  type: 'CASH_SALE' | 'BANK_SALE' | 'EXPENSE' | 'CLOSING_TRANSFER' | 'WITHDRAWAL' | 'REFUND_WITHDRAWAL' | 'INITIAL_CASH' | 'ADJUSTMENT';
  amount: number;
  description: string;
  // Optional: For detailing movements between accounts
  source?: 'CASH' | 'SAFE' | 'BANK' | 'EXTERNAL';
  destination?: 'CASH' | 'SAFE' | 'BANK' | 'EXTERNAL';
  // Optional: For linking to other records
  related_id?: string;
  related_type?: 'Shift' | 'Reserve' | 'Closing';
};


class MockDB {
  employees: Employee[] = [];
  shifts: Shift[] = [];
  reserves: Reserve[] = [];
  closings: Closing[] = [];
  audits: ShiftAudit[] = [];
  transactions: Transaction[] = [];
  safe_balance: number = 0;

  constructor() {
    // Load from localStorage if available (client-side only)
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('shopCashMockDB');
        if (stored) {
          const parsed = JSON.parse(stored);
          this.employees = parsed.employees || [];
          this.shifts = parsed.shifts || [];
          this.reserves = parsed.reserves || [];
          this.closings = parsed.closings || [];
          this.audits = parsed.audits || [];
          // For backward compatibility
          this.transactions = parsed.transactions || [];
          this.safe_balance = parsed.safe_balance || 0;
        }
      } catch (e) {}
    }
  }

  save() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('shopCashMockDB', JSON.stringify({
        employees: this.employees,
        shifts: this.shifts,
        reserves: this.reserves,
        closings: this.closings,
        audits: this.audits,
        transactions: this.transactions,
        safe_balance: this.safe_balance,
      }));
    }
  }

  clearAll() {
    this.employees = [];
    this.shifts = [];
    this.reserves = [];
    this.closings = [];
    this.audits = [];
    this.transactions = [];
    this.safe_balance = 0;
    this.save();
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  }

  addTransaction(tx: Omit<Transaction, 'id' | 'timestamp'>) {
    const newTx = { ...tx, id: Math.random().toString(), timestamp: new Date().toISOString() };
    this.transactions.unshift(newTx);
    this.save();
    return newTx;
  }

  addEmployee(emp: Omit<Employee, 'id' | 'created_at'>) {
    const newEmp = { ...emp, id: Math.random().toString(), created_at: new Date().toISOString() };
    this.employees.push(newEmp);
    this.save();
    return newEmp;
  }

  deleteEmployee(id: string) {
    const idx = this.employees.findIndex(e => e.id === id);
    if (idx !== -1) {
      this.employees[idx].is_deleted = true;
      this.save();
    }
  }

  deleteShift(id: string) {
    this.shifts = this.shifts.filter(s => s.id !== id);
    this.save();
  }

  addShift(shift: Omit<Shift, 'id' | 'created_at'>) {
    const newShift = { ...shift, id: Math.random().toString(), created_at: new Date().toISOString() };
    this.shifts.unshift(newShift);
    
    // Create transactions for the shift
    if (shift.opening_cash > 0) {
      this.addTransaction({
        type: 'INITIAL_CASH',
        amount: shift.opening_cash,
        description: `Vốn ban đầu cho ca làm việc`,
        destination: 'CASH',
        related_id: newShift.id,
        related_type: 'Shift',
      });
    }
    if (shift.cash_revenue > 0) {
      this.addTransaction({
        type: 'CASH_SALE',
        amount: shift.cash_revenue,
        description: `Doanh thu tiền mặt từ ca`,
        destination: 'CASH',
        related_id: newShift.id,
        related_type: 'Shift',
      });
    }
    if (shift.bank_revenue > 0) {
      this.addTransaction({
        type: 'BANK_SALE',
        amount: shift.bank_revenue,
        description: `Doanh thu ngân hàng từ ca`,
        destination: 'BANK',
        related_id: newShift.id,
        related_type: 'Shift',
      });
    }
    if (shift.expense > 0) {
      this.addTransaction({
        type: 'EXPENSE',
        amount: shift.expense,
        description: `Chi phí từ ca`,
        source: 'CASH',
        related_id: newShift.id,
        related_type: 'Shift',
      });
    }

    this.save();
    return newShift;
  }

  updateShift(id: string, updates: Partial<Shift>) {
    const idx = this.shifts.findIndex(s => s.id === id);
    if (idx !== -1) {
      const oldData = { ...this.shifts[idx] };
      this.shifts[idx] = { ...this.shifts[idx], ...updates };
      
      this.audits.unshift({
        id: Math.random().toString(),
        shift_id: id,
        timestamp: new Date().toISOString(),
        old_data: oldData,
        new_data: updates
      });
      
      this.save();
    }
  }

  // Legacy, keep for compatibility but new logic should use transactions
  addReserve(res: Omit<Reserve, 'id' | 'created_at'>) {
    const newRes = { ...res, id: Math.random().toString(), created_at: new Date().toISOString() };
    this.reserves.unshift(newRes);
    this.save();
    return newRes;
  }
  
  // New method for withdrawing cash/safe
  addWithdrawal(amount: number, note: string, source: 'CASH' | 'SAFE') {
    const cashBalance = this.getCurrentCash();
    if (source === 'CASH' && amount > cashBalance) {
      throw new Error('Không thể rút nhiều hơn tiền mặt hiện có.');
    }
    if (source === 'SAFE' && amount > this.safe_balance) {
      throw new Error('Không thể rút nhiều hơn số tiền trong két.');
    }

    const newWithdrawal: Reserve = {
      id: Math.random().toString(),
      date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      amount,
      note,
      source,
    };
    this.reserves.unshift(newWithdrawal);
    
    if (source === 'SAFE') {
      this.safe_balance -= amount;
    }

    this.addTransaction({
      type: 'WITHDRAWAL',
      amount: amount,
      source: source,
      destination: 'EXTERNAL',
      description: note || 'Rút tiền',
      related_id: newWithdrawal.id,
      related_type: 'Reserve',
    });

    this.save();
    return newWithdrawal;
  }

  deleteReserve(id: string) {
    const reserveIdx = this.reserves.findIndex(r => r.id === id);
    if (reserveIdx === -1) return;

    const reserve = this.reserves[reserveIdx];
    if (reserve.is_deleted) return; // Already deleted

    reserve.is_deleted = true;

    // Refund the money to the original source
    if (reserve.source === 'SAFE') {
      this.safe_balance += reserve.amount;
    }
    
    this.addTransaction({
      type: 'REFUND_WITHDRAWAL',
      amount: reserve.amount,
      source: 'EXTERNAL',
      destination: reserve.source,
      description: `Hoàn lại tiền do xoá khoản rút: ${reserve.note}`,
      related_id: reserve.id,
      related_type: 'Reserve',
    });
    
    this.save();
  }


  // Legacy, keep for compatibility
  addClosing(closing: Omit<Closing, 'id' | 'created_at'>) {
    const newCls = { ...closing, id: Math.random().toString(), created_at: new Date().toISOString() };
    this.closings.unshift(newCls);
    this.save();
    return newCls;
  }

  // New method for closing day transfer
  performClosing(amountToSafe: number, note: string) {
    const cashBalance = this.getCurrentCash();
    if (amountToSafe > cashBalance) {
      throw new Error('Không thể cất vào két số tiền lớn hơn tiền mặt hiện có.');
    }

    this.safe_balance += amountToSafe;
    
    const closingId = Math.random().toString();
    this.addTransaction({
      type: 'CLOSING_TRANSFER',
      amount: amountToSafe,
      source: 'CASH',
      destination: 'SAFE',
      description: note || 'Đóng ngày, cất tiền vào két',
      related_id: closingId,
      related_type: 'Closing',
    });

    this.save();
    return { id: closingId, amount: amountToSafe };
  }

  // --- Calculation methods ---

  getTotalRevenue() {
    return this.transactions
      .filter(tx => tx.type === 'CASH_SALE' || tx.type === 'BANK_SALE')
      .reduce((sum, tx) => sum + tx.amount, 0);
  }

  getCurrentCash() {
    return this.transactions.reduce((balance, tx) => {
      if (tx.destination === 'CASH') return balance + tx.amount;
      if (tx.source === 'CASH') return balance - tx.amount;
      return balance;
    }, 0);
  }
}

export const mockDb = new MockDB();
