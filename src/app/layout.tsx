// src/app/layout.tsx
import 'react-toastify/dist/ReactToastify.css';
import { ToastContainer } from 'react-toastify';
import './globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-100">
        {children}
        <ToastContainer position="top-right" autoClose={1000} />
      </body>
    </html>
  );
}