'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { useAuth } from '@/lib/hooks/useAuth';
import {
  FolderKanban,
  Zap,
  DollarSign,
  Plus,
  Search,
  Lightbulb,
  TrendingUp,
  Clock
} from 'lucide-react';
import Link from 'next/link';

interface DashboardStats {
  totalProjects: number;
  apiCallsThisMonth: number;
  totalCost: number;
}

interface RecentProject {
  id: string;
  name: string;
  type: string;
  updated_at: string;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalProjects: 0,
    apiCallsThisMonth: 0,
    totalCost: 0,
  });
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Fetch actual data from Supabase
    // For now, using mock data
    const fetchDashboardData = async () => {
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 500));

        setStats({
          totalProjects: 12,
          apiCallsThisMonth: 1847,
          totalCost: 42.85,
        });

        setRecentProjects([
          {
            id: '1',
            name: 'Market Research - Q1 2025',
            type: 'Research',
            updated_at: new Date().toISOString(),
          },
          {
            id: '2',
            name: 'Product Strategy Analysis',
            type: 'Strategy',
            updated_at: new Date(Date.now() - 86400000).toISOString(),
          },
          {
            id: '3',
            name: 'Competitor Review',
            type: 'Critique',
            updated_at: new Date(Date.now() - 172800000).toISOString(),
          },
        ]);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {user?.user_metadata?.full_name || 'User'}!
        </h1>
        <p className="mt-2 text-gray-600">
          Here's what's happening with your AI projects today.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Projects</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {loading ? '...' : stats.totalProjects}
                </p>
                <div className="flex items-center gap-1 mt-2 text-sm text-green-600">
                  <TrendingUp className="w-4 h-4" />
                  <span>+3 this month</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <FolderKanban className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">API Calls This Month</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {loading ? '...' : stats.apiCallsThisMonth.toLocaleString()}
                </p>
                <div className="flex items-center gap-1 mt-2 text-sm text-green-600">
                  <TrendingUp className="w-4 h-4" />
                  <span>+12% vs last month</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Zap className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Cost</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  ${loading ? '...' : stats.totalCost.toFixed(2)}
                </p>
                <div className="flex items-center gap-1 mt-2 text-sm text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span>This month</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Link href="/projects/new">
            <Button className="w-full justify-start" variant="outline">
              <Plus className="w-5 h-5 mr-2" />
              New Project
            </Button>
          </Link>
          <Link href="/studio/research">
            <Button className="w-full justify-start" variant="outline">
              <Search className="w-5 h-5 mr-2" />
              Research
            </Button>
          </Link>
          <Link href="/studio/strategy">
            <Button className="w-full justify-start" variant="outline">
              <Lightbulb className="w-5 h-5 mr-2" />
              Strategy
            </Button>
          </Link>
          <Link href="/analytics">
            <Button className="w-full justify-start" variant="outline">
              <TrendingUp className="w-5 h-5 mr-2" />
              Analytics
            </Button>
          </Link>
        </div>
      </div>

      {/* Recent Projects */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Recent Projects</h2>
          <Link href="/projects">
            <Button variant="ghost" size="sm">
              View all
            </Button>
          </Link>
        </div>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-gray-500">
                Loading projects...
              </div>
            ) : recentProjects.length === 0 ? (
              <div className="p-8 text-center">
                <FolderKanban className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">No projects yet</p>
                <Link href="/projects/new">
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Project
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {recentProjects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}`}
                    className="block p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                          <FolderKanban className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">{project.name}</h3>
                          <p className="text-sm text-gray-500">{project.type}</p>
                        </div>
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatDate(project.updated_at)}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
