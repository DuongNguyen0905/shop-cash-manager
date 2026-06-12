type Employee = { id: string; name: string; hourly_rate: number; created_at: string; is_deleted?: boolean };
type Shift = {
  id: string; date: string; employee_id: string; start_time: string; end_time: string | null;
  opening_cash: number; cash_revenue: number; bank_revenue: number; expense: number;
  actual_cash: number | null; note: string; created_at: string;
};
type Reserve = { id: string; date: string; amount: number; note: string; created_at: string };
type Closing = { id: string; date: string; cash_total: number; cash_reserved: number; created_at: string };
type ShiftAudit = { id: string; shift_id: string; timestamp: string; old_data: Partial<Shift>; new_data: Partial<Shift> };

class MockDB {
  employees: Employee[] = [];
  shifts: Shift[] = [];
  reserves: Reserve[] = [];
  closings: Closing[] = [];
  audits: ShiftAudit[] = [];

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
      }));
    }
  }

  clearAll() {
    this.employees = [];
    this.shifts = [];
    this.reserves = [];
    this.closings = [];
    this.audits = [];
    this.save();
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
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
    this.save();
    return newShift;
  }

  updateShift(id: string, updates: Partial<Shift>) {
    const idx = this.shifts.findIndex(s => s.id === id);
    if (idx !== -1) {
      const oldData = { ...this.shifts[idx] };
      this.shifts[idx] = { ...this.shifts[idx], ...updates };
      
      // Save audit log
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

  addReserve(res: Omit<Reserve, 'id' | 'created_at'>) {
    const newRes = { ...res, id: Math.random().toString(), created_at: new Date().toISOString() };
    this.reserves.unshift(newRes);
    this.save();
    return newRes;
  }

  addClosing(closing: Omit<Closing, 'id' | 'created_at'>) {
    const newCls = { ...closing, id: Math.random().toString(), created_at: new Date().toISOString() };
    this.closings.unshift(newCls);
    this.save();
    return newCls;
  }
}

export const mockDb = new MockDB();
