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

type StoredMockDB = {
  employees?: Employee[];
  shifts?: Shift[];
  reserves?: Reserve[];
  closings?: Closing[];
  audits?: ShiftAudit[];
  transactions?: Transaction[];
  safe_balance?: number;
  migrated_transactions_from_legacy?: boolean;
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
          const parsed = JSON.parse(stored) as StoredMockDB;
          this.employees = parsed.employees || [];
          this.shifts = parsed.shifts || [];
          this.reserves = parsed.reserves || [];
          this.closings = parsed.closings || [];
          this.audits = parsed.audits || [];
          this.transactions = parsed.transactions || [];
          this.safe_balance = parsed.safe_balance || 0;

          if (this.hasLegacyMoneyData(parsed)) {
            this.migrateLegacyMoneyData();
            this.save();
          }
        }
      } catch (e) {}
    }
  }

  private hasLegacyMoneyData(parsed: StoredMockDB) {
    return (
      (parsed.shifts?.length || 0) > 0 ||
      (parsed.reserves?.length || 0) > 0 ||
      (parsed.closings?.length || 0) > 0
    );
  }

  private legacyTimestamp(date?: string, createdAt?: string) {
    if (createdAt) return createdAt;
    if (date) return new Date(`${date}T12:00:00`).toISOString();
    return new Date().toISOString();
  }

  private makeLegacyTransaction(
    tx: Omit<Transaction, 'id' | 'timestamp'>,
    timestamp: string,
    suffix: string
  ): Transaction {
    return {
      ...tx,
      id: `legacy-${tx.related_type || 'tx'}-${tx.related_id || suffix}-${tx.type}`,
      timestamp,
    };
  }

  private migrateLegacyMoneyData() {
    const migrated: Transaction[] = [];

    for (const shift of this.shifts) {
      const timestamp = this.legacyTimestamp(shift.date, shift.created_at);
      const cashRevenue = Number(shift.cash_revenue) || 0;
      const bankRevenue = Number(shift.bank_revenue) || 0;
      const expense = Number(shift.expense) || 0;

      if (cashRevenue > 0) {
        migrated.push(this.makeLegacyTransaction({
          type: 'CASH_SALE',
          amount: cashRevenue,
          description: 'Doanh thu tiền mặt từ dữ liệu cũ',
          destination: 'CASH',
          related_id: shift.id,
          related_type: 'Shift',
        }, timestamp, shift.id));
      }

      if (bankRevenue > 0) {
        migrated.push(this.makeLegacyTransaction({
          type: 'BANK_SALE',
          amount: bankRevenue,
          description: 'Doanh thu chuyển khoản từ dữ liệu cũ',
          destination: 'BANK',
          related_id: shift.id,
          related_type: 'Shift',
        }, timestamp, shift.id));
      }

      if (expense > 0) {
        migrated.push(this.makeLegacyTransaction({
          type: 'EXPENSE',
          amount: expense,
          description: 'Chi phí từ dữ liệu cũ',
          source: 'CASH',
          related_id: shift.id,
          related_type: 'Shift',
        }, timestamp, shift.id));
      }
    }

    for (const closing of this.closings) {
      const amount = Number(closing.cash_reserved) || 0;
      if (amount <= 0) continue;
      migrated.push(this.makeLegacyTransaction({
        type: 'CLOSING_TRANSFER',
        amount,
        description: 'Đóng ngày, cất tiền vào két từ dữ liệu cũ',
        source: 'CASH',
        destination: 'SAFE',
        related_id: closing.id,
        related_type: 'Closing',
      }, this.legacyTimestamp(closing.date, closing.created_at), closing.id));
    }

    for (const reserve of this.reserves) {
      const amount = Number(reserve.amount) || 0;
      if (amount === 0) continue;
      const timestamp = this.legacyTimestamp(reserve.date, reserve.created_at);
      const isDeleted = reserve.is_deleted;
      const source = reserve.source;

      if (source === 'SAFE' || source === 'CASH') {
        migrated.push(this.makeLegacyTransaction({
          type: 'WITHDRAWAL',
          amount: Math.abs(amount),
          description: reserve.note || 'Rút tiền từ dữ liệu cũ',
          source,
          destination: 'EXTERNAL',
          related_id: reserve.id,
          related_type: 'Reserve',
        }, timestamp, reserve.id));
        if (isDeleted) {
          migrated.push(this.makeLegacyTransaction({
            type: 'REFUND_WITHDRAWAL',
            amount: Math.abs(amount),
            description: `Hoàn lại khoản rút từ dữ liệu cũ: ${reserve.note || ''}`,
            source: 'EXTERNAL',
            destination: source,
            related_id: reserve.id,
            related_type: 'Reserve',
          }, timestamp, `${reserve.id}-refund`));
        }
        continue;
      }

      if (amount > 0) {
        migrated.push(this.makeLegacyTransaction({
          type: 'ADJUSTMENT',
          amount,
          description: reserve.note || 'Nạp quỹ từ dữ liệu cũ',
          source: 'EXTERNAL',
          destination: 'SAFE',
          related_id: reserve.id,
          related_type: 'Reserve',
        }, timestamp, reserve.id));
      } else {
        migrated.push(this.makeLegacyTransaction({
          type: 'WITHDRAWAL',
          amount: Math.abs(amount),
          description: reserve.note || 'Rút quỹ từ dữ liệu cũ',
          source: 'SAFE',
          destination: 'EXTERNAL',
          related_id: reserve.id,
          related_type: 'Reserve',
        }, timestamp, reserve.id));
      }
    }

    const existingIds = new Set(this.transactions.map(tx => tx.id));
    const merged = [
      ...this.transactions,
      ...migrated.filter(tx => !existingIds.has(tx.id)),
    ];

    this.transactions = merged.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    this.safe_balance = this.transactions.reduce((balance, tx) => {
      if (tx.destination === 'SAFE') return balance + tx.amount;
      if (tx.source === 'SAFE') return balance - tx.amount;
      return balance;
    }, 0);
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
        migrated_transactions_from_legacy: true,
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
