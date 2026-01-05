import React, { useEffect, useState } from 'react';
import { useAuth } from '../features/auth';
import {
  getDashboardStats,
  getMyAssignments,
  getRecentActivity,
  DashboardStats,
  DashboardActivity,
} from '../api/dashboard';
import { Card } from '../components/ui/Card';
import { Badge, BadgeVariant } from '../components/ui/Badge';
import { FileText, PlayCircle, CheckSquare, User, Activity, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

const HomePage: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [assignments, setAssignments] = useState<DashboardActivity[]>([]);
  const [activities, setActivities] = useState<DashboardActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const [statsRes, assignRes, activityRes] = await Promise.all([
          getDashboardStats(),
          getMyAssignments(),
          getRecentActivity(),
        ]);

        if (statsRes.success) setStats(statsRes.data);
        if (assignRes.success) setAssignments(assignRes.data);
        if (activityRes.success) setActivities(activityRes.data);
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('Failed to load dashboard data', error);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  if (isLoading) {
    return <div className="flex justify-center items-center h-full text-slate-500">Loading dashboard...</div>;
  }

  const statCards = [
    {
      label: 'Total Test Cases',
      value: stats?.totalTestCases || 0,
      icon: FileText,
      color: 'bg-blue-100 text-blue-600',
    },
    {
      label: 'Active Plans',
      value: stats?.activePlans || 0,
      icon: PlayCircle,
      color: 'bg-emerald-100 text-emerald-600',
    },
    {
      label: 'Total Executions',
      value: stats?.totalPlanItems || 0,
      icon: Activity,
      color: 'bg-purple-100 text-purple-600',
    },
    { label: 'My Assignments', value: stats?.myAssignedCount || 0, icon: User, color: 'bg-amber-100 text-amber-600' },
  ];

  const getStatusColor = (status: string): BadgeVariant => {
    switch (status) {
      case 'PASS':
        return 'success';
      case 'FAIL':
        return 'error';
      case 'BLOCK':
        return 'neutral'; // Blocked -> neutral/dark
      case 'IN_PROGRESS':
        return 'warning';
      default:
        return 'neutral';
    }
  };

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-1">Welcome back, {user?.name}!</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => (
          <Card
            key={index}
            className="p-6 flex items-center space-x-4 border-none shadow-sm hover:shadow-md transition-shadow"
          >
            <div className={`p-3 rounded-full ${card.color}`}>
              <card.icon size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">{card.label}</p>
              <p className="text-2xl font-bold text-slate-900">{card.value}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* My Assignments */}
        <Card className="flex flex-col h-[500px]">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <CheckSquare className="text-indigo-500" size={20} />
              My Assignments
            </h2>
            <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
              {assignments.length} tasks
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-0">
            {assignments.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <CheckSquare size={48} className="mb-4 opacity-20" />
                <p>No pending assignments</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {assignments.map((item) => (
                  <Link
                    key={item.id}
                    to={`/plans/${item.planId}`}
                    className="block p-4 hover:bg-slate-50 transition-colors group"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-sm font-medium text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                        {item.testCase.title}
                      </span>
                      <Badge variant={getStatusColor(item.result)} size="sm">
                        {item.result.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center text-xs text-slate-500 mt-2">
                      <span className="flex items-center gap-1">
                        <PlayCircle size={12} />
                        {item.plan.name}
                      </span>
                      {item.testCase.priority && (
                        <span
                          className={`uppercase font-semibold tracking-wider ${
                            item.testCase.priority === 'HIGH'
                              ? 'text-red-500'
                              : item.testCase.priority === 'MEDIUM'
                                ? 'text-amber-500'
                                : 'text-emerald-500'
                          }`}
                        >
                          {item.testCase.priority}
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Recent Activity */}
        <Card className="flex flex-col h-[500px]">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Clock className="text-slate-500" size={20} />
              Recent Activity
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            {activities.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <Activity size={48} className="mb-4 opacity-20" />
                <p>No recent activity</p>
              </div>
            ) : (
              <div className="relative border-l border-slate-200 ml-3 space-y-8">
                {activities.map((activity) => (
                  <div key={activity.id} className="relative pl-8">
                    <span
                      className={`absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full ring-4 ring-white ${
                        activity.result === 'PASS'
                          ? 'bg-emerald-500'
                          : activity.result === 'FAIL'
                            ? 'bg-red-500'
                            : 'bg-slate-400'
                      }`}
                    ></span>
                    <div className="flex flex-col gap-1">
                      <p className="text-sm text-slate-900">
                        <span className="font-medium">{activity.assignee || 'Someone'}</span> updated{' '}
                        <span className="font-medium text-indigo-600">{activity.testCase.title}</span> to{' '}
                        <Badge variant={getStatusColor(activity.result)} size="sm" className="ml-1 inline-flex">
                          {activity.result}
                        </Badge>
                      </p>
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        {new Date(activity.executedAt || activity.updatedAt).toLocaleString()}
                        <span className="mx-1">•</span>
                        {activity.plan.name}
                      </span>
                      {activity.comment && (
                        <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded mt-1 border border-slate-100 italic">
                          &quot;{activity.comment}&quot;
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default HomePage;
