import { useEffect, useState } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { UserProfile, UserStatus } from '../context/AuthContext';
import { TOOLS } from '../config/tools';

const CATEGORIES = [...new Set(TOOLS.map((t) => t.category))];

export function AdminPage() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [expandedUid, setExpandedUid] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | UserStatus>('all');

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

  const toggleManager = async (uid: string, currentRole: string) => {
    const newRole = currentRole === 'manager' ? 'user' : 'manager';
    setUpdating(uid + 'role');
    await updateDoc(doc(db, 'users', uid), { role: newRole });
    setUsers((prev) => prev.map((u) => (u.uid === uid ? { ...u, role: newRole as UserProfile['role'] } : u)));
    setUpdating(null);
  };

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
    const next = current.includes(toolId) ? current.filter((id) => id !== toolId) : [...current, toolId];
    setUpdating(uid + toolId);
    await updateDoc(doc(db, 'users', uid), { allowedTools: next });
    setUsers((prev) => prev.map((u) => (u.uid === uid ? { ...u, allowedTools: next } : u)));
    setUpdating(null);
  };

  const setAllTools = async (uid: string, grant: boolean) => {
    const next = grant ? TOOLS.map((t) => t.id) : [];
    setUpdating(uid + '__all');
    await updateDoc(doc(db, 'users', uid), { allowedTools: next });
    setUsers((prev) => prev.map((u) => (u.uid === uid ? { ...u, allowedTools: next } : u)));
    setUpdating(null);
  };

  const pendingCount = users.filter((u) => u.status === 'pending').length;

  const sortedUsers = [...users].sort((a, b) => {
    const aTs = (a.createdAt as { seconds?: number } | null)?.seconds ?? 0;
    const bTs = (b.createdAt as { seconds?: number } | null)?.seconds ?? 0;
    return bTs - aTs;
  });

  const filteredUsers = statusFilter === 'all' ? sortedUsers : sortedUsers.filter((u) => u.status === statusFilter);

  const statusBadge = (status: UserStatus) => {
    const map: Record<UserStatus, { cls: string; label: string }> = {
      pending:  { cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', label: 'Pending' },
      approved: { cls: 'bg-green-100  text-green-700  dark:bg-green-900/30  dark:text-green-400',  label: 'Approved' },
      rejected: { cls: 'bg-red-100    text-red-700    dark:bg-red-900/30    dark:text-red-400',    label: 'Rejected' },
    };
    const { cls, label } = map[status];
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
        {label}
      </span>
    );
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">User Management</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {users.length} users total
            {pendingCount > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 text-yellow-600 dark:text-yellow-400 font-medium">
                · {pendingCount} pending approval
              </span>
            )}
          </p>
        </div>

        {/* Filter pills */}
        <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
          {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg capitalize transition-colors ${
                statusFilter === f
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {f === 'all' ? 'All' : f}
              {f === 'pending' && pendingCount > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold bg-yellow-500 text-white rounded-full">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_1.4fr_auto_auto] items-center gap-4 px-5 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Name</span>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Email</span>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</span>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider text-right pr-1">Actions</span>
          </div>

          {filteredUsers.length === 0 && (
            <div className="px-5 py-10 text-center text-gray-400 text-sm">No users found.</div>
          )}

          {filteredUsers.map((u) => {
            const isExpanded = expandedUid === u.uid;
            const isApproved = u.status === 'approved';
            const allowed = u.allowedTools ?? TOOLS.map((t) => t.id);
            const toolCount = allowed.length;
            const isUpdatingUser = updating === u.uid;
            const isUpdatingRole = updating === u.uid + 'role';
            const isUpdatingAll = updating === u.uid + '__all';

            return (
              <div key={u.uid} className="border-b border-gray-100 dark:border-gray-800 last:border-0">
                {/* Main row */}
                <div className="grid grid-cols-[1fr_1.4fr_auto_auto] items-center gap-4 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                  {/* Name + role badge + expand toggle */}
                  <div className="flex items-center gap-2 min-w-0">
                    {isApproved && u.role !== 'admin' ? (
                      <button
                        onClick={() => setExpandedUid(isExpanded ? null : u.uid)}
                        className="flex items-center gap-2 min-w-0 group"
                        title={isExpanded ? 'Collapse tool permissions' : 'Expand tool permissions'}
                      >
                        <svg
                          className={`w-3.5 h-3.5 shrink-0 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                        <span className="font-medium text-sm text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {u.name}
                        </span>
                      </button>
                    ) : (
                      <span className="font-medium text-sm text-gray-900 dark:text-white truncate pl-5">{u.name}</span>
                    )}
                    {u.role === 'admin' && (
                      <span className="text-xs text-blue-600 dark:text-blue-400 font-medium shrink-0">(admin)</span>
                    )}
                    {u.role === 'manager' && (
                      <span className="text-xs text-purple-600 dark:text-purple-400 font-medium shrink-0">(manager)</span>
                    )}
                    {isApproved && u.role !== 'admin' && (
                      <span className="text-xs text-gray-400 shrink-0">
                        {toolCount}/{TOOLS.length} tools
                      </span>
                    )}
                  </div>

                  {/* Email */}
                  <span className="text-sm text-gray-500 dark:text-gray-400 truncate">{u.email}</span>

                  {/* Status */}
                  <div>{statusBadge(u.status)}</div>

                  {/* Action buttons */}
                  <div className="flex items-center justify-end gap-1.5">
                    {u.status === 'pending' && (
                      <button
                        onClick={() => updateStatus(u.uid, 'approved')}
                        disabled={isUpdatingUser}
                        className="px-2.5 py-1 text-xs font-medium bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg transition-colors"
                      >
                        Approve
                      </button>
                    )}
                    {u.role !== 'admin' && u.status === 'approved' && (
                      <button
                        onClick={() => toggleManager(u.uid, u.role)}
                        disabled={isUpdatingRole}
                        className={`px-2.5 py-1 text-xs font-medium disabled:opacity-50 text-white rounded-lg transition-colors ${
                          u.role === 'manager'
                            ? 'bg-purple-600 hover:bg-purple-700'
                            : 'bg-gray-300 hover:bg-purple-500 dark:bg-gray-600 dark:hover:bg-purple-600 !text-gray-700 dark:!text-white'
                        }`}
                      >
                        {u.role === 'manager' ? 'Unset Mgr' : 'Set Mgr'}
                      </button>
                    )}
                    {u.status !== 'rejected' && u.role !== 'admin' && (
                      <button
                        onClick={() => updateStatus(u.uid, 'rejected')}
                        disabled={isUpdatingUser}
                        className="px-2.5 py-1 text-xs font-medium bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg transition-colors"
                      >
                        Reject
                      </button>
                    )}
                    {u.status !== 'pending' && (
                      <button
                        onClick={() => updateStatus(u.uid, 'pending')}
                        disabled={isUpdatingUser}
                        className="px-2.5 py-1 text-xs font-medium bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 disabled:opacity-50 text-gray-600 dark:text-gray-300 rounded-lg transition-colors"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded: tool permissions panel */}
                {isExpanded && isApproved && u.role !== 'admin' && (
                  <div className="px-5 pb-4 pt-1 bg-blue-50/40 dark:bg-blue-900/10 border-t border-blue-100 dark:border-blue-900/30">
                    {/* Panel header */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Tool Permissions
                      </span>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => setAllTools(u.uid, true)}
                          disabled={!!isUpdatingAll}
                          className="px-2.5 py-1 text-xs font-medium bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg transition-colors"
                        >
                          Grant all
                        </button>
                        <button
                          onClick={() => setAllTools(u.uid, false)}
                          disabled={!!isUpdatingAll}
                          className="px-2.5 py-1 text-xs font-medium bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg transition-colors"
                        >
                          Revoke all
                        </button>
                      </div>
                    </div>

                    {/* Tool chips grouped by category */}
                    <div className="space-y-2.5">
                      {CATEGORIES.map((cat) => {
                        const catTools = TOOLS.filter((t) => t.category === cat);
                        return (
                          <div key={cat} className="flex items-start gap-3">
                            <span className="text-xs text-gray-400 capitalize w-24 shrink-0 pt-1.5">{cat}</span>
                            <div className="flex flex-wrap gap-1.5">
                              {catTools.map((tool) => {
                                const hasAccess = allowed.includes(tool.id);
                                const isUpdating = updating === u.uid + tool.id;
                                return (
                                  <button
                                    key={tool.id}
                                    onClick={() => toggleToolAccess(u.uid, tool.id)}
                                    disabled={isUpdating}
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all disabled:opacity-50 ${
                                      hasAccess
                                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                                    }`}
                                  >
                                    <span>{tool.icon}</span>
                                    <span>{tool.name}</span>
                                    {isUpdating && (
                                      <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
