import { useEffect, useState } from 'react';
import { getAllProgress, approveProgress } from '../lib/firestore';
import type { LearningProgress } from '../types';

const STATUS_LABELS = {
  not_started: 'Chưa học',
  in_progress: 'Đang học',
  completed: 'Hoàn thành',
};

const STATUS_COLORS = {
  not_started: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

interface Props {
  isCMO: boolean;
}

export default function OnboardingDashboard({ isCMO }: Props) {
  const [progress, setProgress] = useState<LearningProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'in_progress' | 'not_started'>('all');
  const [filterUser, setFilterUser] = useState('all');

  async function load() {
    setLoading(true);
    try {
      const data = await getAllProgress();
      setProgress(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleApprove(id: string, by: 'lead' | 'cmo') {
    await approveProgress(id, by);
    load();
  }

  const users = ['all', ...Array.from(new Set(progress.map(p => p.userName))).filter(Boolean)];

  const filtered = progress.filter(p => {
    const matchStatus = filterStatus === 'all' || p.status === filterStatus;
    const matchUser = filterUser === 'all' || p.userName === filterUser;
    return matchStatus && matchUser;
  });

  // Summary stats
  const completed = progress.filter(p => p.status === 'completed').length;
  const inProgress = progress.filter(p => p.status === 'in_progress').length;
  const pendingApproval = progress.filter(p => p.status === 'completed' && (!p.approvedByLead || !p.approvedByCMO)).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Quản lý Onboarding</h2>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Tổng bản ghi', value: progress.length, color: 'bg-gray-100 dark:bg-gray-700' },
          { label: 'Đang học', value: inProgress, color: 'bg-blue-50 dark:bg-blue-900/20' },
          { label: 'Hoàn thành', value: completed, color: 'bg-green-50 dark:bg-green-900/20' },
          { label: 'Chờ phê duyệt', value: pendingApproval, color: 'bg-orange-50 dark:bg-orange-900/20' },
        ].map(stat => (
          <div key={stat.label} className={`${stat.color} rounded-xl p-4`}>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <select
          value={filterUser}
          onChange={e => setFilterUser(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {users.map(u => (
            <option key={u} value={u}>{u === 'all' ? 'Tất cả nhân viên' : u}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as typeof filterStatus)}
          className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="in_progress">Đang học</option>
          <option value="completed">Hoàn thành</option>
          <option value="not_started">Chưa học</option>
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">
          <div className="text-4xl mb-3">👥</div>
          <div className="text-sm">Chưa có dữ liệu learning progress.</div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-750 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Nhân viên</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">SOP</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Trạng thái</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Lead duyệt</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">CMO duyệt</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filtered.map(p => (
                <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900 dark:text-white">{p.userName || p.userId}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-gray-700 dark:text-gray-300">{p.sopTitle}</div>
                    {p.status === 'in_progress' && (
                      <div className="text-xs text-gray-400 mt-0.5">Bước {p.currentStep + 1}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[p.status]}`}>
                      {STATUS_LABELS[p.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {p.approvedByLead ? (
                      <span className="text-green-600 dark:text-green-400 text-xs font-medium">✓ Đã duyệt</span>
                    ) : (
                      <span className="text-gray-400 text-xs">Chưa duyệt</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {p.approvedByCMO ? (
                      <span className="text-green-600 dark:text-green-400 text-xs font-medium">✓ Đã duyệt</span>
                    ) : (
                      <span className="text-gray-400 text-xs">Chưa duyệt</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {p.status === 'completed' && (
                      <div className="flex gap-2">
                        {!p.approvedByLead && (
                          <button
                            onClick={() => handleApprove(p.id, 'lead')}
                            className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                          >
                            Duyệt (Lead)
                          </button>
                        )}
                        {!p.approvedByCMO && isCMO && (
                          <button
                            onClick={() => handleApprove(p.id, 'cmo')}
                            className="px-2 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                          >
                            Duyệt (CMO)
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
