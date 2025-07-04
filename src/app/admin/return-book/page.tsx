'use client';

import { useUser } from '@/app/hooks/useUser';

export default function ReturnBookPage() {
  const user = useUser();

  return (
    <main className="p-4">
      <h1 className="text-2xl font-bold mb-4">Return Book</h1>
      <p className="text-gray-600">Process Book Return</p>

      {user && (
        <div className="mt-4 p-4 bg-gray-100 rounded-md">
          <p className="font-semibold">Welcome, {user.name}</p>
          {user.profilePic && (
            <img
              src={user.profilePic}
              alt="Profile"
              className="w-16 h-16 mt-2 rounded-full object-cover"
            />
          )}
        </div>
      )}
    </main>
  );
}
