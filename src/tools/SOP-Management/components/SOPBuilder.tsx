import { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { createSOP, updateSOP, getSOPById } from '../lib/firestore';
import { generateSOPFromDescription } from '../lib/qwen';
import type { SOPStep, AssigneeRole, StepType } from '../types';
import { ASSIGNEE_ROLE_LABELS, STEP_TYPE_LABELS, SOP_CATEGORIES, SOP_TEAMS } from '../types';

interface Props {
  editingSopId?: string;
  onDone: () => void;
}

const newStep = (order: number): SOPStep => ({
  id: crypto.randomUUID(),
  order,
  title: '',
  description: '',
  assigneeRole: 'staff',
  sla: '',
  type: 'sequential',
  exampleOutput: '',
  notes: '',
});

export default function SOPBuilder({ editingSopId, onDone }: Props) {
  const { profile, user } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(SOP_CATEGORIES[0]);
  const [team, setTeam] = useState('');
  const [tags, setTags] = useState('');
  const [roles, setRoles] = useState<AssigneeRole[]>(['staff']);
  const [steps, setSteps] = useState<SOPStep[]>([newStep(1)]);
  const [status, setStatus] = useState<'draft' | 'published'>('draft');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [expandedStep, setExpandedStep] = useState<string | null>(null);

  useEffect(() => {
    if (!editingSopId) return;
    setLoading(true);
    getSOPById(editingSopId).then(sop => {
      if (!sop) return;
      setTitle(sop.title);
      setDescription(sop.description);
      setCategory(sop.category);
      setTeam(sop.team ?? '');
      setTags(sop.tags.join(', '));
      setRoles(sop.roles);
      setSteps(sop.steps);
      setStatus(sop.status);
      setLoading(false);
    });
  }, [editingSopId]);

  function addStep() {
    setSteps(prev => {
      const next = [...prev, newStep(prev.length + 1)];
      setExpandedStep(next[next.length - 1].id);
      return next;
    });
  }

  function removeStep(id: string) {
    setSteps(prev => prev.filter(s => s.id !== id).map((s, i) => ({ ...s, order: i + 1 })));
  }

  function moveStep(id: string, dir: 'up' | 'down') {
    setSteps(prev => {
      const idx = prev.findIndex(s => s.id === id);
      if (dir === 'up' && idx === 0) return prev;
      if (dir === 'down' && idx === prev.length - 1) return prev;
      const next = [...prev];
      const swap = dir === 'up' ? idx - 1 : idx + 1;
      [next[idx], next[swap]] = [next[swap], next[idx]];
      return next.map((s, i) => ({ ...s, order: i + 1 }));
    });
  }

  function updateStep(id: string, patch: Partial<SOPStep>) {
    setSteps(prev => prev.map(s => (s.id === id ? { ...s, ...patch } : s)));
  }

  function toggleRole(role: AssigneeRole) {
    setRoles(prev =>
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    );
  }

  async function handleAIGenerate() {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    setAiError('');
    try {
      const result = await generateSOPFromDescription(aiPrompt);
      setTitle(prev => prev || result.title);
      setCategory(result.category);
      setSteps(result.steps.map((s, i) => ({ ...s, id: crypto.randomUUID(), order: i + 1 })));
      setAiPrompt('');
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'Lỗi không xác định');
    } finally {
      setAiLoading(false);
    }
  }

  async function handleSave() {
    if (!title.trim() || steps.length === 0) return;
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        category,
        team,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        roles,
        steps,
        status,
        createdBy: user?.uid ?? '',
        createdByName: profile?.name ?? profile?.email ?? 'Unknown',
      };
      if (editingSopId) {
        await updateSOP(editingSopId, payload);
      } else {
        await createSOP(payload);
      }
      onDone();
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          {editingSopId ? 'Chỉnh sửa SOP' : 'Tạo SOP mới'}
        </h2>
        <button
          onClick={onDone}
          className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
        >
          ← Quay lại
        </button>
      </div>

      {/* AI Generate */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-700 p-4">
        <div className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">
          AI Sinh SOP từ mô tả
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={aiPrompt}
            onChange={e => setAiPrompt(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAIGenerate()}
            placeholder='VD: "Quy trình ra mắt sản phẩm mới, có nhánh online và offline"'
            className="flex-1 px-3 py-2 text-sm border border-blue-300 dark:border-blue-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleAIGenerate}
            disabled={aiLoading || !aiPrompt.trim()}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
          >
            {aiLoading ? 'Đang tạo...' : 'Tạo với AI'}
          </button>
        </div>
        {aiError && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{aiError}</p>}
        <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">
          AI sẽ tự sinh các bước dựa trên mô tả. Bạn có thể chỉnh sửa sau.
        </p>
      </div>

      {/* Basic Info */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
        <h3 className="font-medium text-gray-900 dark:text-white">Thông tin chung</h3>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Tên SOP <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="VD: Quy trình xử lý khiếu nại khách hàng Shopee"
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Mô tả
          </label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={2}
            placeholder="Mô tả ngắn gọn mục đích và phạm vi của SOP này..."
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Danh mục
            </label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {SOP_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Team
            </label>
            <select
              value={team}
              onChange={e => setTeam(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— Chọn team —</option>
              {SOP_TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Tags (phân cách bằng dấu phẩy)
          </label>
          <input
            type="text"
            value={tags}
            onChange={e => setTags(e.target.value)}
            placeholder="shopee, khiếu nại, CS"
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Áp dụng cho
          </label>
          <div className="flex gap-2 flex-wrap">
            {(['cmo', 'lead', 'staff', 'all'] as AssigneeRole[]).map(r => (
              <button
                key={r}
                onClick={() => toggleRole(r)}
                className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                  roles.includes(r)
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-blue-400'
                }`}
              >
                {ASSIGNEE_ROLE_LABELS[r]}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Trạng thái
          </label>
          <div className="flex gap-2">
            {(['draft', 'published'] as const).map(s => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                  status === s
                    ? s === 'published'
                      ? 'bg-green-600 text-white border-green-600'
                      : 'bg-yellow-500 text-white border-yellow-500'
                    : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-gray-400'
                }`}
              >
                {s === 'published' ? 'Published' : 'Nháp'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-gray-900 dark:text-white">
            Các bước ({steps.length})
          </h3>
          <button
            onClick={addStep}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            + Thêm bước
          </button>
        </div>

        {steps.map((step, idx) => (
          <div
            key={step.id}
            className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
          >
            {/* Step header */}
            <div
              className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-750 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
              onClick={() => setExpandedStep(expandedStep === step.id ? null : step.id)}
            >
              <span className="w-6 h-6 flex items-center justify-center bg-blue-600 text-white text-xs rounded-full font-bold shrink-0">
                {step.order}
              </span>
              <span className="flex-1 text-sm font-medium text-gray-900 dark:text-white truncate">
                {step.title || `Bước ${step.order}`}
              </span>
              <span className="text-xs text-gray-400 shrink-0">
                {ASSIGNEE_ROLE_LABELS[step.assigneeRole]}
              </span>
              {step.sla && (
                <span className="text-xs text-orange-500 shrink-0">{step.sla}</span>
              )}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={e => { e.stopPropagation(); moveStep(step.id, 'up'); }}
                  disabled={idx === 0}
                  className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                >↑</button>
                <button
                  onClick={e => { e.stopPropagation(); moveStep(step.id, 'down'); }}
                  disabled={idx === steps.length - 1}
                  className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                >↓</button>
                <button
                  onClick={e => { e.stopPropagation(); removeStep(step.id); }}
                  className="p-1 text-red-400 hover:text-red-600"
                >✕</button>
              </div>
            </div>

            {/* Step form */}
            {expandedStep === step.id && (
              <div className="p-4 space-y-3">
                <input
                  type="text"
                  value={step.title}
                  onChange={e => updateStep(step.id, { title: e.target.value })}
                  placeholder="Tên bước *"
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <textarea
                  value={step.description}
                  onChange={e => updateStep(step.id, { description: e.target.value })}
                  rows={3}
                  placeholder="Mô tả chi tiết bước này — làm gì, tại sao, cách làm..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Phụ trách</label>
                    <select
                      value={step.assigneeRole}
                      onChange={e => updateStep(step.id, { assigneeRole: e.target.value as AssigneeRole })}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {(['cmo', 'lead', 'staff', 'all'] as AssigneeRole[]).map(r => (
                        <option key={r} value={r}>{ASSIGNEE_ROLE_LABELS[r]}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Loại bước</label>
                    <select
                      value={step.type}
                      onChange={e => updateStep(step.id, { type: e.target.value as StepType })}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {(['sequential', 'parallel', 'decision'] as StepType[]).map(t => (
                        <option key={t} value={t}>{STEP_TYPE_LABELS[t]}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">SLA</label>
                    <input
                      type="text"
                      value={step.sla}
                      onChange={e => updateStep(step.id, { sla: e.target.value })}
                      placeholder="VD: 2 giờ, 1 ngày"
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <textarea
                  value={step.exampleOutput ?? ''}
                  onChange={e => updateStep(step.id, { exampleOutput: e.target.value })}
                  rows={2}
                  placeholder="Output/kết quả cần đạt sau bước này (tùy chọn)"
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
                <textarea
                  value={step.notes ?? ''}
                  onChange={e => updateStep(step.id, { notes: e.target.value })}
                  rows={2}
                  placeholder="Lưu ý / cạm bẫy thường gặp (tùy chọn)"
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            )}
          </div>
        ))}

        {steps.length === 0 && (
          <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">
            Chưa có bước nào. Thêm bước hoặc dùng AI để tạo tự động.
          </div>
        )}
      </div>

      {/* Save */}
      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={saving || !title.trim()}
          className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? 'Đang lưu...' : editingSopId ? 'Lưu thay đổi' : 'Tạo SOP'}
        </button>
        <button
          onClick={onDone}
          className="px-6 py-2.5 text-sm text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          Hủy
        </button>
      </div>
    </div>
  );
}
