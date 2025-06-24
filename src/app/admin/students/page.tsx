// library-management-system/src/app/admin/subjects/page.tsx
'use client';
import Layout from '@/app/components/Layout';

import pic  from '../../../public/images/library.jpg'; // 

const students = () => {

  return (
    <Layout role="admin" user={{ name: 'Admin', profilePic: pic.src }}>
    <h1>Manage Subjects</h1>
    </Layout>
  );
};

export default students;