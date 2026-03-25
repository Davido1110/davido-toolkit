import { useEffect, useState } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { UserProfile, UserStatus } from '../context/AuthContext';
import { TOOLS } from '../config/tools';

type AdminTab = 'hub-access' | 'tool-permissions';

export function AdminPage() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>('hub-access');
  const [selectedToolId, setSelectedToolId] = useState<string>(TOOLS[0]?.id ?? '');

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

  const tabCls = (id: AdminTab) =>
    `px-5 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
      activeTab === id
        ? 'border-blue-600 text-blue-700 dark:border-blue-400 dark:text-blue-300'
        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
    }`;

  const pendingCount = users.filter((u) => u.status === 'pending').length;
  const approvedUsers = users.filter((u) => u.status === 'approved' && u.role !== 'admin');
  const selectedTool = TOOLS.find((t) => t.id === selectedToolId);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">User Management</h1>

      {/* Tab bar */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
        <button className={tabCls('hub-access')} onClick={() => setActiveTab('hub-access')}>
          Part 1 — Hub Access
          {pendingCount > 0 && (
            <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs font-bold bg-yellow-500 text-white rounded-full">
              {pendingCount}
            </span>
          )}
        </button>
        <button className={tabCls('tool-permissions')} onClick={() => setActiveTab('tool-permissions')}>
          Part 2 — Tool Permissions
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* ── Part 1: Hub Access ── */}
          {activeTab === 'hub-access' && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800">
                    <th className="text-left px-5 py-3.5 font-medium text-gray-500 dark:text-gray-400">Name</th>
                    <th className="text-left px-5 py-3.5 font-medium text-gray-500 dark:text-gray-400">Email</th>
                    <th className="text-left px-5 py-3.5 font-medium text-gray-500 dark:text-gray-400">Status</th>
                    <th className="text-right px-5 py-3.5 font-medium text-gray-500 dark:text-gray-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {users.map((u) => (
                    <tr key={u.uid} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-5 py-4 font-medium text-gray-900 dark:text-white">
                        {u.name}
                        {u.role === 'admin' && (
                          <span className="ml-2 text-xs text-brand-600">(admin)</span>
                        )}
                        {u.role === 'manager' && (
                          <span className="ml-2 text-xs text-purple-600 dark:text-purple-400">(manager)</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-gray-500 dark:text-gray-400">{u.email}</td>
                      <td className="px-5 py-4">{statusBadge(u.status)}</td>
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
                          {u.role !== 'admin' && (
                            <button
                              onClick={() => toggleManager(u.uid, u.role)}
                              disabled={updating === u.uid + 'role'}
                              className={`px-3 py-1.5 text-xs font-medium disabled:opacity-50 text-white rounded-lg transition-colors ${
                                u.role === 'manager'
                                  ? 'bg-purple-600 hover:bg-purple-700'
                                  : 'bg-gray-400 hover:bg-purple-500'
                              }`}
                            >
                              {u.role === 'manager' ? 'Unset Manager' : 'Set Manager'}
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
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-5 py-8 text-center text-gray-400">
                        No users yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Part 2: Tool Permissions ── */}
          {activeTab === 'tool-permissions' && (
            <div className="flex gap-5">
              {/* Tool selector — left panel */}
              <div className="w-56 shrink-0 space-y-1">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-3">Select Tool</p>
                {TOOLS.map((tool) => {
                  const accessCount = approvedUsers.filter((u) => {
                    const allowed = u.allowedTools ?? TOOLS.map((t) => t.id);
                    return allowed.includes(tool.id);
                  }).length;
                  return (
                    <button
                      key={tool.id}
                      onClick={() => setSelectedToolId(tool.id)}
                      className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-sm transition-colors text-left ${
                        selectedToolId === tool.id
                          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                    >
                      <span className="flex items-center gap-2 truncate">
                        <span>{tool.icon}</span>
                        <span className="truncate">{tool.name}</span>
                      </span>
                      <span className={`text-xs shrink-0 ${selectedToolId === tool.id ? 'text-blue-500' : 'text-gray-400'}`}>
                        {accessCount}/{approvedUsers.length}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* User access list — right panel */}
              <div className="flex-1">
                {selectedTool ? (
                  <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                    {/* Panel header */}
                    <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{selectedTool.icon}</span>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">{selectedTool.name}</p>
                          <p className="text-xs text-gray-400">{selectedTool.description}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={async () => {
                            for (const u of approvedUsers) {
                              const current = u.allowedTools ?? TOOLS.map((t) => t.id);
                              if (!current.includes(selectedToolId)) {
                                await toggleToolAccess(u.uid, selectedToolId);
                              }
                            }
                          }}
                          className="px-3 py-1.5 text-xs font-medium bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                        >
                          Grant all
                        </button>
                        <button
                          onClick={async () => {
                            for (const u of approvedUsers) {
                              const current = u.allowedTools ?? TOOLS.map((t) => t.id);
                              if (current.includes(selectedToolId)) {
                                await toggleToolAccess(u.uid, selectedToolId);
                              }
                            }
                          }}
                          className="px-3 py-1.5 text-xs font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                        >
                          Revoke all
                        </button>
                      </div>
                    </div>

                    {approvedUsers.length === 0 ? (
                      <div className="px-5 py-8 text-center text-gray-400 text-sm">
                        No approved users yet.
                      </div>
                    ) : (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-100 dark:border-gray-800">
                            <th className="text-left px-5 py-3 font-medium text-gray-500 dark:text-gray-400">User</th>
                            <th className="text-left px-5 py-3 font-medium text-gray-500 dark:text-gray-400">Email</th>
                            <th className="text-right px-5 py-3 font-medium text-gray-500 dark:text-gray-400">Access</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                          {approvedUsers.map((u) => {
                            const allowed = u.allowedTools ?? TOOLS.map((t) => t.id);
                            const hasAccess = allowed.includes(selectedToolId);
                            const isUpdating = updating === u.uid + selectedToolId;
                            return (
                              <tr key={u.uid} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                <td className="px-5 py-3.5 font-medium text-gray-900 dark:text-white">
                                  {u.name}
                                  {u.role === 'manager' && (
                                    <span className="ml-2 text-xs text-purple-600 dark:text-purple-400">(manager)</span>
                                  )}
                                </td>
                                <td className="px-5 py-3.5 text-gray-500 dark:text-gray-400">{u.email}</td>
                                <td className="px-5 py-3.5">
                                  <div className="flex justify-end">
                                    <button
                                      onClick={() => toggleToolAccess(u.uid, selectedToolId)}
                                      disabled={isUpdating}
                                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 focus:outline-none ${
                                        hasAccess ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                                      }`}
                                    >
                                      <span
                                        className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                                          hasAccess ? 'translate-x-6' : 'translate-x-1'
                                        }`}
                                      />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
                    Select a tool to manage access.
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
