// src/app/student/my-account/page.tsx

import Layout from "@/app/components/Layout";

export default function MyAccountPage() {
  return (
       <Layout role={"student"} user={{
      name: "mukesh KUMAR",
      profilePic: ""
    }}>
    <h1>Manage Subjects</h1> <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-blue-600">Welcome students</h1>
      </div>
    </main>
    </Layout>
   
  );
}
