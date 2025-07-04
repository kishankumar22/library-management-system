// src/app/student/my-account/page.tsx
'use client';
import { useUser } from '@/app/hooks/useUser';
export default function MyAccountPage() {
    const user = useUser();
  return (
    <>
      <div className="text-center">
        <h1 className="text-2xl font-bold text-blue-600">Welcome to {user.name}</h1>        
         
      </div>
  
  </>
   
  );
}
