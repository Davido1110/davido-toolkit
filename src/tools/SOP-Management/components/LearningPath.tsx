import { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { getPublishedSOPs, getMyProgress } from '../lib/firestore';
import type { SOP, LearningProgress } from '../types';

interface Props {
  onStartSOP: (sop: SOP) => void;
}

export default function LearningPath({ onStartSOP }: Props) {
  const { user, profile } = useAuth();
  const [sops, setSops] = useState<SOP[]>([]);
  const [progress, setProgress] = useState<LearningProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([getPublishedSOPs(), getMyProgress(user.uid)]).then(([s, p]) => {
      setSops(s);
      setProgress(p);
      setLoading(false);
    });
  }, [user]);

  function getProgress(sopId: string): LearningProgress | undefined {
    return progress.find(p => p.sopId === sopId);
  }

  const completed = progress.filter(p => p.status === 'completed').length;
  const fullyApproved = progress.filter(p => p.approvedByLead && p.approvedByCMO).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Lộ trình học của tôi
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Xin chào, <span className="font-medium">{profile?.name ?? profile?.email}</span>! Hãy hoàn thành các SOP để được phê duyệt thực thi task.
        </p>
      </div>

      {/* Progress Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{sops.length}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">SOP cần học</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{completed}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Đã hoàn thành</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">{fullyApproved}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Được phê duyệt</div>
        </div>
      </div>

      {/* Overall progress bar */}
      {sops.length > 0 && (
        <div>
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
            <span>Tiến độ tổng thể</span>
            <span>{completed}/{sops.length}</span>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
            <div
              className="h-full bg-blue-600 rounded-full transition-all"
              style={{ width: `${sops.length > 0 ? (completed / sops.length) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {/* SOP List */}
      {sops.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">
          <div className="text-4xl mb-3">📚</div>
          <div className="text-sm">Chưa có SOP nào được publish.</div>
        </div>
      ) : (
        <div className="space-y-3">
          {sops.map((sop, idx) => {
            const prog = getProgress(sop.id);
            const status = prog?.status ?? 'not_started';
            const isApproved = prog?.approvedByLead && prog?.approvedByCMO;

            return (
              <div
                key={sop.id}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4"
              >
                <div className="flex items-start gap-4">
                  {/* Step number / status icon */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shrink-0 text-sm ${
                    isApproved
                      ? 'bg-purple-600'
                      : status === 'completed'
                      ? 'bg-green-600'
                      : status === 'in_progress'
                      ? 'bg-blue-600'
                      : 'bg-gray-300 dark:bg-gray-600'
                  }`}>
                    {isApproved ? '★' : status === 'completed' ? '✓' : idx + 1}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{sop.title}</h3>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                        {sop.category}
                      </span>
                    </div>
                    {sop.description && (
                      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 line-clamp-1">{sop.description}</p>
                    )}
                    <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
                      <span>{sop.steps.length} bước</span>
                      {prog && (
                        <>
                          {status === 'in_progress' && (
                            <span className="text-blue-500">Đang ở bước {(prog.currentStep ?? 0) + 1}</span>
                          )}
                          <span className={
                            isApproved ? 'text-purple-500' :
                            status === 'completed' ? 'text-orange-500' :
                            status === 'in_progress' ? 'text-blue-500' : 'text-gray-400'
                          }>
                            {isApproved
                              ? 'Được phê duyệt'
                              : status === 'completed'
                              ? 'Hoàn thành — chờ phê duyệt'
                              : status === 'in_progress'
                              ? 'Đang học'
                              : ''}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Approval badges */}
                    {status === 'completed' && (
                      <div className="mt-2 flex gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          prog?.approvedByLead
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                        }`}>
                          {prog?.approvedByLead ? '✓ Lead duyệt' : '⏳ Chờ Lead'}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          prog?.approvedByCMO
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                            : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                        }`}>
                          {prog?.approvedByCMO ? '✓ CMO duyệt' : '⏳ Chờ CMO'}
                        </span>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => onStartSOP(sop)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors shrink-0 ${
                      status === 'not_started'
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : status === 'in_progress'
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    {status === 'not_started' ? 'Bắt đầu' : status === 'in_progress' ? 'Tiếp tục' : 'Xem lại'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
