'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { 
  Book, 
  Users, 
  Calendar, 
  Loader2, 
  Info, 
  AlertTriangle, 
  TrendingUp,
  BookOpen,
  Building2,
  ArrowUpRight,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react';

type Issue = {
  BookTitle: string;
  StudentName: string;
  IssueDate: string;
  Status: string;
  DueDate: string;
  IssueId?: number; // Optional, based on sample data
};

type StockHistory = {
  BookName: string;
  CopiesAdded: number;
  CreatedOn: string;
};

type Penalty = {
  PenaltyId: number;
  BookTitle: string;
  StudentName: string;
  Amount: number;
  TotalPaid: number;
  PenaltyStatus: string;
  DueDate: string;
  ReturnDate: string;
  CreatedOn: string;
  BookIssueStatus?: string;
  courseYear?: string;
};

type DashboardData = {
  totalBooks: number;
  availableBooks: number;
  totalBookIssue: number;
  TotalOverDue: number;
  totalCourses: number;
  totalPenalties: number;
  recentIssues: Issue[];
  stockHistory: StockHistory[];
  monthlyIssues: { [month: string]: number };
  recentPenalties: Penalty[];
};

export default function AdminPage() {
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    totalBooks: 0,
    availableBooks: 0,
    totalBookIssue: 0,
    TotalOverDue: 0,
    totalCourses: 0,
    totalPenalties: 0,
    recentIssues: [],
    stockHistory: [],
    monthlyIssues: {},
    recentPenalties: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [
          booksRes,
          availableBooksRes,
          studentsRes,
          publicationsRes,
          coursesRes,
          penaltiesRes,
          issuesRes,
          stockHistoryRes,
        ] = await Promise.all([
          axios.get('/api/book'),
          axios.get('/api/book?availableCopies=1'),
          axios.get('/api/student'),
          axios.get('/api/publication'),
          axios.get('/api/course'),
          axios.get('/api/penalty'),
          axios.get('/api/book-issue'),
          axios.get('/api/book-stock-history'),
        ]);

        const monthlyIssues = issuesRes.data.reduce((acc: { [x: string]: any; }, issue: { IssueDate: string | number | Date; }) => {
          const month = new Date(issue.IssueDate).toLocaleString('default', { month: 'long' });
          acc[month] = (acc[month] || 0) + 1;
          return acc;
        }, {} as { [month: string]: number });

        // Filter and deduplicate unpaid penalties
        const unpaidPenalties: Penalty[] = Array.from(
          new Map<number, Penalty>(
            penaltiesRes.data
              .filter((penalty: { PenaltyStatus: string }) => penalty.PenaltyStatus.toLowerCase() === 'unpaid')
              .map((item: Penalty) => [item.PenaltyId, item])
          ).values()
        );
        const totalPenalties = unpaidPenalties.length;
        // Take top 5 recent penalties from deduplicated unpaid penalties
        const recentPenalties: Penalty[] = unpaidPenalties.slice(0, 5);

        // Calculate total issued books
        const BookIssueCount = issuesRes.data.filter(
          (issue: { Status: string }) => issue.Status === 'issued'
        ).length;

        // Calculate total overdue books
        const now = new Date(); // 01:57 PM IST (UTC+5:30)
        const TotalOverDue = issuesRes.data.filter((issue: { DueDate: string; Status: string }) => {
          const dueDate = new Date(issue.DueDate);
          return dueDate < now && issue.Status !== 'returned';
        }).length;

        setDashboardData({
          totalBooks: booksRes.data.length,
          availableBooks: availableBooksRes.data.length,
          totalBookIssue: BookIssueCount,
          TotalOverDue,
          totalCourses: coursesRes.data.length,
          totalPenalties,
          recentIssues: issuesRes.data.slice(0, 5).map(issue => ({
            BookTitle: issue.BookTitle,
            StudentName: issue.StudentName,
            IssueDate: issue.IssueDate,
            Status: issue.Status,
            DueDate: issue.DueDate,
            IssueId: issue.IssueId, // Use IssueId if available
          })),
          stockHistory: stockHistoryRes.data.slice(0, 5),
          monthlyIssues,
          recentPenalties,
        });
      } catch (err) {
        setError('Failed to load dashboard data. Please try again later.');
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Transform monthly data for chart
  const chartData = Object.entries(dashboardData.monthlyIssues).map(([month, count]) => ({
    month: month.slice(0, 3),
    issues: count
  }));

  const calculateLateDays = (penalty: Penalty) => {
    const returnDate = new Date(penalty.ReturnDate);
    const dueDate = new Date(penalty.DueDate);
    return Math.max(0, Math.ceil((returnDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));
  };

  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    gradient, 
    textColor, 
    href 
  }: {
    title: string;
    value: number | string;
    icon: any;
    gradient: string;
    textColor: string;
    href: string;
  }) => (
    <div className={`relative overflow-hidden bg-gradient-to-br ${gradient} p-4 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 group`}>
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-2">
          <div className={`p-2 rounded-lg bg-white/20 backdrop-blur-sm`}>
            <Icon className={`h-4 w-4 ${textColor}`} />
          </div>
        </div>
        
        <h3 className={`text-xs font-medium ${textColor} opacity-90 mb-1`}>{title}</h3>
        <p className={`text-xl font-bold ${textColor} mb-2`}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
        
        <a
          href={href}
          className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white/20 backdrop-blur-sm ${textColor} text-xs font-medium hover:bg-white/30 transition-colors`}
        >
          <Info className="h-3 w-3" />
          View
        </a>
      </div>
      
      <div className="absolute top-0 right-0 w-16 h-16 opacity-10">
        <Icon className="w-full h-full" />
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
          <p className="text-gray-600 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="text-center p-8 bg-white rounded-2xl shadow-lg">
          <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 text-lg font-medium">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br -mt-4 from-gray-50 to-blue-50  p-2 ">
      <div className="">
        {/* Header */}
    

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <StatCard
            title="Available Books"
            value={dashboardData.availableBooks}
            icon={Book}
            gradient="from-blue-500 to-blue-500"
            textColor="text-white"
            href="/admin/book"
          />
          <StatCard
            title="Book Issued"
            value={dashboardData.totalBookIssue}
            icon={Users}
            gradient="from-purple-500 to-purple-600"
            textColor="text-white"
            href="/admin/book-issue"
          />
          <StatCard
            title="Overdue Books"
            value={dashboardData.TotalOverDue}
            icon={AlertTriangle}
            gradient="from-amber-500 to-amber-600"
            textColor="text-white"
            href="/admin/book-issue"
          />
          <StatCard
            title="Active Penalties"
            value={dashboardData.totalPenalties}
            icon={AlertTriangle}
            gradient="from-orange-500 to-orange-600"
            textColor="text-white"
            href="/admin/penalty"
          />
        </div>

        {/* Charts and Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          {/* Chart */}
          <div className="bg-white rounded-xl shadow-md p-4 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 bg-blue-100 rounded-lg">
                <TrendingUp className="h-4 w-4 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Books Issued (Monthly)</h3>
            </div>
            
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="month" 
                    stroke="#64748b"
                    fontSize={12}
                    tickLine={false}
                  />
                  <YAxis 
                    stroke="#64748b"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Bar 
                    dataKey="issues" 
                    fill="url(#colorGradient)"
                    radius={[4, 4, 0, 0]}
                  />
                  <defs>
                    <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#1d4ed8" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Issues */}
          <div className="bg-white rounded-xl shadow-md p-4 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 bg-green-100 rounded-lg">
                <Clock className="h-4 w-4 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Recent Book Issues</h3>
            </div>
            
            <div className="space-y-2">
              {dashboardData.recentIssues.map((issue, index) => (
                <div key={issue.IssueId || `issue-${index}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 uppercase text-xs">{issue.BookTitle}</p>
                    <p className="text-gray-600 text-xs">{issue.StudentName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">
                      {new Date(issue.IssueDate).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Penalties */}
          <div className="bg-white rounded-xl shadow-md p-4 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 bg-red-100 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Recent Book Penalties</h3>
            </div>
            
            <div className="space-y-3">
              {dashboardData.recentPenalties.length > 0 ? (
                dashboardData.recentPenalties.map((penalty, index) => (
                  <div key={`${penalty.PenaltyId}-${index}`} className="p-3 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium text-gray-900 uppercase text-xs">{penalty.BookTitle}</p>
                        <p className="text-gray-600 text-xs">{penalty.StudentName}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        {penalty.PenaltyStatus === 'paid' ? (
                          <CheckCircle className="h-3 w-3 text-green-500" />
                        ) : (
                          <Clock className="h-3 w-3 text-orange-500" />
                        )}
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          penalty.PenaltyStatus === 'paid' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-orange-100 text-orange-700'
                        }`}>
                          {penalty.PenaltyStatus}
                        </span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="text-gray-500">Amount</p>
                        <p className="font-semibold">₹{penalty.Amount}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Days Late</p>
                        <p className="font-semibold text-orange-600">{calculateLateDays(penalty)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Paid</p>
                        <p className="font-semibold text-green-600">₹{penalty.TotalPaid}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Remaining</p>
                        <p className="font-semibold text-red-600">₹{penalty.Amount - penalty.TotalPaid}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  <p className="text-sm">No penalties found</p>
                </div>
              )}
            </div>
          </div>

          {/* Stock History */}
          <div className="bg-white rounded-xl shadow-md p-4 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 bg-purple-100 rounded-lg">
                <TrendingUp className="h-4 w-4 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Recent Stock Updates</h3>
            </div>
            
            <div className="space-y-2">
              {dashboardData.stockHistory.map((history, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 uppercase text-xs">{history.BookName}</p>
                    <p className="text-gray-500 text-xs">
                      {new Date(history.CreatedOn).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </p>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    history.CopiesAdded >= 0 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {history.CopiesAdded >= 0 ? '+' : ''}{history.CopiesAdded}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}