import { useState, useRef } from 'react';
import type { Employee, Entity } from '../types';
import { parseEmployeeExcel } from '../utils/excelImport';

interface Props {
  employees: Employee[];
  onUpdate: (employees: Employee[]) => void;
}

type FilterEntity = 'All' | Entity;

const EMPTY_FORM: Omit<Employee, 'id'> = {
  name: '',
  entity: 'Cty',
  baseSalary: 0,
  hasCommission: false,
  commissionRate: 0,
  allowance: 1_000_000,
};

function fmt(n: number): string {
  return n.toLocaleString('vi-VN');
}

const inputCls = 'w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500';

interface FormFieldsProps {
  prefix: string;
  form: Omit<Employee, 'id'>;
  setForm: (f: Omit<Employee, 'id'>) => void;
}

function FormFields({ prefix, form, setForm }: FormFieldsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Họ tên *</label>
        <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nguyễn Văn A" id={`${prefix}-name`} />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Pháp nhân</label>
        <select className={inputCls} value={form.entity} onChange={(e) => setForm({ ...form, entity: e.target.value as Entity })}>
          <option value="Cty">Cty (Leonardo)</option>
          <option value="HKD">HKD (Lê Khắc Thông)</option>
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Lương HĐLĐ (VNĐ)</label>
        <input className={inputCls} type="number" value={form.baseSalary || ''} onChange={(e) => setForm({ ...form, baseSalary: Number(e.target.value) })} placeholder="10000000" />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Phụ cấp (VNĐ)</label>
        <input className={inputCls} type="number" value={form.allowance || ''} onChange={(e) => setForm({ ...form, allowance: Number(e.target.value) })} placeholder="1000000" />
      </div>
      <div className="flex items-center gap-2 mt-4">
        <input type="checkbox" id={`${prefix}-hh`} checked={form.hasCommission} onChange={(e) => setForm({ ...form, hasCommission: e.target.checked })} className="w-4 h-4" />
        <label htmlFor={`${prefix}-hh`} className="text-sm text-gray-700 dark:text-gray-300">Có hoa hồng</label>
      </div>
      {form.hasCommission && (
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Tỷ lệ HH (%)</label>
          <input className={inputCls} type="number" step="0.1" min="0" max="100" value={(form.commissionRate * 100) || ''} onChange={(e) => setForm({ ...form, commissionRate: Number(e.target.value) / 100 })} placeholder="5" />
        </div>
      )}
    </div>
  );
}

export function MasterDataTab({ employees, onUpdate }: Props) {
  const [filter, setFilter] = useState<FilterEntity>('All');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState<Omit<Employee, 'id'>>(EMPTY_FORM);
  const [newId, setNewId] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [pendingImport, setPendingImport] = useState<Employee[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filtered = filter === 'All' ? employees : employees.filter((e) => e.entity === filter);

  function handleEdit(emp: Employee) {
    setEditingId(emp.id);
    setForm({
      name: emp.name,
      entity: emp.entity,
      baseSalary: emp.baseSalary,
      hasCommission: emp.hasCommission,
      commissionRate: emp.commissionRate,
      allowance: emp.allowance,
    });
    setShowAddForm(false);
  }

  function handleSaveEdit() {
    if (!editingId) return;
    onUpdate(employees.map((e) => (e.id === editingId ? { ...form, id: editingId } : e)));
    setEditingId(null);
  }

  function handleDelete(id: string) {
    onUpdate(employees.filter((e) => e.id !== id));
  }

  function handleAdd() {
    if (!newId.trim() || !form.name.trim()) return;
    if (employees.some((e) => e.id === newId.trim())) {
      alert('Mã NV đã tồn tại');
      return;
    }
    onUpdate([...employees, { ...form, id: newId.trim() }]);
    setShowAddForm(false);
    setForm(EMPTY_FORM);
    setNewId('');
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setImportError(null);
    try {
      const imported = await parseEmployeeExcel(file);
      if (imported.length === 0) {
        setImportError('File không có dữ liệu hợp lệ');
        return;
      }
      setPendingImport(imported);
      setShowImportConfirm(true);
    } catch (err) {
      setImportError('Lỗi đọc file: ' + (err instanceof Error ? err.message : String(err)));
    }
  }

  function confirmImport() {
    if (pendingImport) {
      onUpdate(pendingImport);
      setPendingImport(null);
    }
    setShowImportConfirm(false);
  }

    return (
    <div className="p-4 flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          {(['All', 'Cty', 'HKD'] as FilterEntity[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${filter === f ? 'bg-white dark:bg-gray-700 shadow text-blue-700 dark:text-blue-300' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
            >
              {f === 'All' ? 'Tất cả' : f}
            </button>
          ))}
        </div>
        <span className="text-sm text-gray-500 dark:text-gray-400">{filtered.length} nhân viên</span>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => { setShowAddForm(true); setEditingId(null); setForm(EMPTY_FORM); setNewId(''); }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Thêm NV
          </button>
          <a
            href="/pay-slip-mau-nhan-vien.xlsx"
            download
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            📥 File mẫu
          </a>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            📤 Upload Excel
          </button>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileChange} />
        </div>
      </div>

      {importError && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
          ⚠️ {importError}
        </div>
      )}

      {/* Add form */}
      {showAddForm && (
        <div className="border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 flex flex-col gap-3">
          <h3 className="font-semibold text-blue-800 dark:text-blue-300 text-sm">Thêm nhân viên mới</h3>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Mã NV *</label>
            <input className={inputCls} value={newId} onChange={(e) => setNewId(e.target.value)} placeholder="NV001" />
          </div>
          <FormFields prefix="add" form={form} setForm={setForm} />
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowAddForm(false)} className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">Hủy</button>
            <button onClick={handleAdd} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Lưu</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-900">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
            Chưa có nhân viên. Nhấn "Thêm NV" hoặc upload Excel.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Mã NV</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Họ tên</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Pháp nhân</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Lương HĐLĐ</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Hoa hồng</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Phụ cấp</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((emp) => (
                  <>
                    <tr key={emp.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-4 py-3 font-mono text-xs text-gray-500 dark:text-gray-400">{emp.id}</td>
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{emp.name}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 text-xs rounded-full font-medium ${emp.entity === 'Cty' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'}`}>
                          {emp.entity}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{fmt(emp.baseSalary)}</td>
                      <td className="px-4 py-3 text-center">
                        {emp.hasCommission ? (
                          <span className="text-green-600 dark:text-green-400">{(emp.commissionRate * 100).toFixed(2)}%</span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{fmt(emp.allowance)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => handleEdit(emp)} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">Sửa</button>
                          <button onClick={() => handleDelete(emp.id)} className="text-xs text-red-500 hover:underline">Xóa</button>
                        </div>
                      </td>
                    </tr>
                    {editingId === emp.id && (
                      <tr key={`${emp.id}-edit`} className="bg-yellow-50 dark:bg-yellow-900/10 border-b border-yellow-200 dark:border-yellow-800">
                        <td colSpan={7} className="px-4 py-3">
                          <div className="flex flex-col gap-3">
                            <FormFields prefix={`edit-${emp.id}`} form={form} setForm={setForm} />
                            <div className="flex gap-2 justify-end">
                              <button onClick={() => setEditingId(null)} className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">Hủy</button>
                              <button onClick={handleSaveEdit} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Lưu</button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Import confirmation dialog */}
      {showImportConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Xác nhận import</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Import sẽ thay thế toàn bộ {employees.length} nhân viên hiện tại bằng {pendingImport?.length} nhân viên từ file. Tiếp tục?
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowImportConfirm(false)} className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">Hủy</button>
              <button onClick={confirmImport} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700">Thay thế tất cả</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
