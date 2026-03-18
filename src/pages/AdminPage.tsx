import { useEffect, useState } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { UserProfile, UserStatus } from '../context/AuthContext';
import { TOOLS } from '../config/tools';

export function AdminPage() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [expandedTools, setExpandedTools] = useState<string | null>(null);

  if (profile?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  const fetchUsers = async () => {
    setLoading(true);
    const snap = await getDocs(collection(db, 'users'));
    setUsers(snap.docs.map((d) => d.data() as UserProfile));
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const updateStatus = async (uid: string, status: UserStatus) => {
    setUpdating(uid);
    await updateDoc(doc(db, 'users', uid), { status });
    setUsers((prev) => prev.map((u) => (u.uid === uid ? { ...u, status } : u)));
    setUpdating(null);
  };

  const toggleToolAccess = async (uid: string, toolId: string) => {
    const user = users.find((u) => u.uid === uid);
    if (!user) return;
    const current = user.allowedTools ?? TOOLS.map((t) => t.id);
    const next = current.includes(toolId)
      ? current.filter((id) => id !== toolId)
      : [...current, toolId];
    setUpdating(uid + toolId);
    await updateDoc(doc(db, 'users', uid), { allowedTools: next });
    setUsers((prev) => prev.map((u) => (u.uid === uid ? { ...u, allowedTools: next } : u)));
    setUpdating(null);
  };

  const statusBadge = (status: UserStatus) => {
    const classes: Record<UserStatus, string> = {
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${classes[status]}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">User Management</h1>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800">
                <th className="text-left px-5 py-3.5 font-medium text-gray-500 dark:text-gray-400">Name</th>
                <th className="text-left px-5 py-3.5 font-medium text-gray-500 dark:text-gray-400">Email</th>
                <th className="text-left px-5 py-3.5 font-medium text-gray-500 dark:text-gray-400">Status</th>
                <th className="text-left px-5 py-3.5 font-medium text-gray-500 dark:text-gray-400">Tools</th>
                <th className="text-right px-5 py-3.5 font-medium text-gray-500 dark:text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {users.map((u) => {
                const allowedTools = u.role === 'admin' ? TOOLS.map((t) => t.id) : (u.allowedTools ?? TOOLS.map((t) => t.id));
                const accessCount = allowedTools.length;
                const isExpanded = expandedTools === u.uid;

                return (
                  <>
                    <tr key={u.uid} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-5 py-4 font-medium text-gray-900 dark:text-white">
                        {u.name}
                        {u.role === 'admin' && (
                          <span className="ml-2 text-xs text-brand-600">(admin)</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-gray-500 dark:text-gray-400">{u.email}</td>
                      <td className="px-5 py-4">{statusBadge(u.status)}</td>
                      <td className="px-5 py-4">
                        {u.role === 'admin' ? (
                          <span className="text-xs text-gray-400">All (admin)</span>
                        ) : (
                          <button
                            onClick={() => setExpandedTools(isExpanded ? null : u.uid)}
                            className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-brand-400 hover:text-brand-600 transition-colors text-gray-600 dark:text-gray-400"
                          >
                            <span>{accessCount}/{TOOLS.length} tools</span>
                            <svg className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {u.status !== 'approved' && (
                            <button
                              onClick={() => updateStatus(u.uid, 'approved')}
                              disabled={updating === u.uid}
                              className="px-3 py-1.5 text-xs font-medium bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg transition-colors"
                            >
                              Approve
                            </button>
                          )}
                          {u.status !== 'rejected' && u.role !== 'admin' && (
                            <button
                              onClick={() => updateStatus(u.uid, 'rejected')}
                              disabled={updating === u.uid}
                              className="px-3 py-1.5 text-xs font-medium bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg transition-colors"
                            >
                              Reject
                            </button>
                          )}
                          {u.status !== 'pending' && (
                            <button
                              onClick={() => updateStatus(u.uid, 'pending')}
                              disabled={updating === u.uid}
                              className="px-3 py-1.5 text-xs font-medium bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 disabled:opacity-50 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
                            >
                              Reset
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Tool access panel */}
                    {isExpanded && u.role !== 'admin' && (
                      <tr key={`${u.uid}-tools`} className="bg-gray-50 dark:bg-gray-800/30">
                        <td colSpan={5} className="px-5 py-4">
                          <div className="flex flex-wrap gap-2">
                            {TOOLS.map((tool) => {
                              const hasAccess = allowedTools.includes(tool.id);
                              const isUpdating = updating === u.uid + tool.id;
                              return (
                                <button
                                  key={tool.id}
                                  onClick={() => toggleToolAccess(u.uid, tool.id)}
                                  disabled={isUpdating}
                                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors disabled:opacity-50 ${
                                    hasAccess
                                      ? 'bg-green-50 border-green-300 text-green-700 dark:bg-green-900/30 dark:border-green-700 dark:text-green-300'
                                      : 'bg-white border-gray-200 text-gray-400 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-500'
                                  }`}
                                >
                                  <span>{tool.icon}</span>
                                  <span>{tool.name}</span>
                                  {hasAccess
                                    ? <span className="text-green-500">✓</span>
                                    : <span className="text-gray-300">✕</span>
                                  }
                                </button>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-gray-400">
                    No users yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
