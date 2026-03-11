import { useAuth } from '../context/AuthContext';

export function PendingPage() {
  const { logout, profile } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="w-full max-w-md text-center">
        <div className="text-6xl mb-6">⏳</div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
          Waiting for approval
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mb-2">
          Hi <span className="font-medium text-gray-700 dark:text-gray-300">{profile?.name}</span>,
          your account has been registered.
        </p>
        <p className="text-gray-500 dark:text-gray-400 mb-8">
          An admin will review and approve your access shortly.
        </p>
        <button
          onClick={logout}
          className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 underline"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
