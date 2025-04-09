import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface StatCardProps {
  title: string;
  count: number;
  color: string;
}

interface CaseStats {
  new: number;
  assigned: number;
  underReview: number;
  submitted: number;
  approved: number;
}

interface CasesByOwner {
  owner: string;
  assigned: number;
  underReview: number;
  submitted: number;
}

interface DaysToFile {
  days: number;
  count: number;
}

type TabType = 'CTRs' | '8300s' | 'PSAs';

const StatCard: React.FC<StatCardProps> = ({ title, count, color }) => (
  <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
    <h3 className={`text-2xl font-bold ${color} mb-2`}>{count}</h3>
    <p className="text-gray-600 dark:text-gray-400">{title}</p>
  </div>
);

export function DashboardStats() {
  const [stats, setStats] = useState<CaseStats>({
    new: 0,
    assigned: 0,
    underReview: 0,
    submitted: 0,
    approved: 0
  });
  const [casesByOwner, setCasesByOwner] = useState<CasesByOwner[]>([]);
  const [form8300sByOwner, setForm8300sByOwner] = useState<CasesByOwner[]>([]);
  const [daysToFile, setDaysToFile] = useState<DaysToFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('CTRs');
  const [form8300Stats, setForm8300Stats] = useState<CaseStats>({
    new: 0,
    assigned: 0,
    underReview: 0,
    submitted: 0,
    approved: 0
  });
  const [psaStats, setPsaStats] = useState<CaseStats>({
    new: 0,
    assigned: 0,
    underReview: 0,
    submitted: 0,
    approved: 0
  });
  const [userFirstName, setUserFirstName] = useState<string>('');

  useEffect(() => {
    loadDashboardData();
    loadUserProfile();
  }, [activeTab]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const loadUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('first_name')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      if (profile?.first_name) {
        setUserFirstName(profile.first_name);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (activeTab === 'CTRs') {
        // Get CTR statistics by status
        const { data: statusData, error: statusError } = await supabase
          .from('ctrs')
          .select('status, recommendation')
          .not('status', 'is', null);

        if (statusError) throw statusError;

        // Calculate status counts
        const statusCounts = statusData?.reduce((acc, curr) => {
          if (!curr.recommendation?.includes('PSA')) {
            acc[curr.status.toLowerCase()] = (acc[curr.status.toLowerCase()] || 0) + 1;
          }
          return acc;
        }, {} as Record<string, number>);

        setStats({
          new: statusCounts?.new || 0,
          assigned: statusCounts?.assigned || 0,
          underReview: statusCounts?.['under review'] || 0,
          submitted: statusCounts?.submitted || 0,
          approved: statusCounts?.approved || 0
        });

        // Get CTRs by owner with profile information
        const { data: ownerData, error: ownerError } = await supabase
          .from('ctrs')
          .select(`
            status,
            current_owner,
            recommendation,
            profiles!ctrs_current_owner_fkey (
              full_name
            )
          `)
          .not('current_owner', 'is', null);

        if (ownerError) throw ownerError;

        // Process owner statistics
        const ownerStats = new Map<string, { name: string, assigned: number, underReview: number, submitted: number }>();
        
        ownerData?.forEach(item => {
          if (item.recommendation?.includes('PSA')) return;
          
          const ownerName = item.profiles?.full_name || 'Unassigned';
          const currentStats = ownerStats.get(item.current_owner) || {
            name: ownerName,
            assigned: 0,
            underReview: 0,
            submitted: 0
          };
          
          switch (item.status) {
            case 'Assigned':
              currentStats.assigned++;
              break;
            case 'Under Review':
              currentStats.underReview++;
              break;
            case 'Submitted':
              currentStats.submitted++;
              break;
          }
          
          ownerStats.set(item.current_owner, currentStats);
        });

        const processedOwnerStats = Array.from(ownerStats.values())
          .filter(stats => stats.assigned + stats.underReview + stats.submitted > 0)
          .sort((a, b) => 
            (b.assigned + b.underReview + b.submitted) - 
            (a.assigned + a.underReview + a.submitted)
          );

        setCasesByOwner(processedOwnerStats);

      } else if (activeTab === '8300s') {
        // Get 8300 statistics
        const { data: form8300Data, error: form8300Error } = await supabase
          .from('form_8300s')
          .select('status, recommendation')
          .not('status', 'is', null);

        if (form8300Error) throw form8300Error;

        const form8300Counts = form8300Data?.reduce((acc, curr) => {
          if (!curr.recommendation?.includes('PSA')) {
            acc[curr.status.toLowerCase()] = (acc[curr.status.toLowerCase()] || 0) + 1;
          }
          return acc;
        }, {} as Record<string, number>);

        setForm8300Stats({
          new: form8300Counts?.new || 0,
          assigned: form8300Counts?.assigned || 0,
          underReview: form8300Counts?.['under review'] || 0,
          submitted: form8300Counts?.submitted || 0,
          approved: form8300Counts?.approved || 0
        });

        // Get 8300s by owner with profile information
        const { data: ownerData, error: ownerError } = await supabase
          .from('form_8300s')
          .select(`
            status,
            current_owner,
            recommendation,
            profiles!form_8300s_current_owner_fkey (
              full_name
            )
          `)
          .not('current_owner', 'is', null);

        if (ownerError) throw ownerError;

        // Process owner statistics for 8300s
        const ownerStats = new Map<string, { name: string, assigned: number, underReview: number, submitted: number }>();
        
        ownerData?.forEach(item => {
          if (item.recommendation?.includes('PSA')) return;
          
          const ownerName = item.profiles?.full_name || 'Unassigned';
          const currentStats = ownerStats.get(item.current_owner) || {
            name: ownerName,
            assigned: 0,
            underReview: 0,
            submitted: 0
          };
          
          switch (item.status) {
            case 'Assigned':
              currentStats.assigned++;
              break;
            case 'Under Review':
              currentStats.underReview++;
              break;
            case 'Submitted':
              currentStats.submitted++;
              break;
          }
          
          ownerStats.set(item.current_owner, currentStats);
        });

        const processedOwnerStats = Array.from(ownerStats.values())
          .filter(stats => stats.assigned + stats.underReview + stats.submitted > 0)
          .sort((a, b) => 
            (b.assigned + b.underReview + b.submitted) - 
            (a.assigned + a.underReview + a.submitted)
          );

        setForm8300sByOwner(processedOwnerStats);

      } else if (activeTab === 'PSAs') {
        // Get PSA statistics from both CTRs and 8300s
        const [ctrData, form8300Data] = await Promise.all([
          supabase
            .from('ctrs')
            .select('status, recommendation')
            .not('status', 'is', null)
            .like('recommendation', '%PSA%'),
          supabase
            .from('form_8300s')
            .select('status, recommendation')
            .not('status', 'is', null)
            .like('recommendation', '%PSA%')
        ]);

        if (ctrData.error) throw ctrData.error;
        if (form8300Data.error) throw form8300Data.error;

        const psaCounts = [...(ctrData.data || []), ...(form8300Data.data || [])]
          .reduce((acc, curr) => {
            acc[curr.status.toLowerCase()] = (acc[curr.status.toLowerCase()] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);

        setPsaStats({
          new: psaCounts?.new || 0,
          assigned: psaCounts?.assigned || 0,
          underReview: psaCounts?.['under review'] || 0,
          submitted: psaCounts?.submitted || 0,
          approved: psaCounts?.approved || 0
        });
      }

      // Get all cases that need to be filed (not approved or rejected)
      const { data: ctrs, error: ctrsError } = await supabase
        .from(activeTab === 'CTRs' ? 'ctrs' : 'form_8300s')
        .select('gaming_day, status')
        .not('status', 'in', '("Approved","Rejected")');

      if (ctrsError) throw ctrsError;

      // Calculate days until deadline for each case using current date
      const currentDate = new Date();
      currentDate.setHours(0, 0, 0, 0);

      const daysStats = ctrs?.reduce((acc, ctr) => {
        const gamingDay = new Date(ctr.gaming_day);
        const deadline = new Date(gamingDay);
        deadline.setDate(deadline.getDate() + 15); // 15-day filing deadline

        const daysRemaining = Math.ceil((deadline.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
        const daysBucket = Math.floor(daysRemaining / 5) * 5; // Group into 5-day buckets
        
        acc[daysBucket] = (acc[daysBucket] || 0) + 1;
        return acc;
      }, {} as Record<number, number>);

      // Convert to array and sort by days
      const processedDaysStats = Object.entries(daysStats || {})
        .map(([days, count]) => ({
          days: parseInt(days),
          count
        }))
        .sort((a, b) => a.days - b.days);

      setDaysToFile(processedDaysStats);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setError('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500 dark:text-red-400">{error}</div>
      </div>
    );
  }

  const currentStats = activeTab === 'CTRs' ? stats : activeTab === '8300s' ? form8300Stats : psaStats;
  const currentOwnerStats = activeTab === 'CTRs' ? casesByOwner : form8300sByOwner;

  return (
    <div className="space-y-6">
      {/* Greeting Message */}
      {userFirstName && (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            {getGreeting()}, {userFirstName}
          </h2>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {(['CTRs', '8300s', 'PSAs'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                ${activeTab === tab
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }
              `}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard title="New" count={currentStats.new} color="text-blue-600 dark:text-blue-400" />
        <StatCard title="Assigned" count={currentStats.assigned} color="text-orange-600 dark:text-orange-400" />
        <StatCard title="Under Review" count={currentStats.underReview} color="text-red-600 dark:text-red-400" />
        <StatCard title="Submitted for Approval" count={currentStats.submitted} color="text-teal-600 dark:text-teal-400" />
        <StatCard title="Approved" count={currentStats.approved} color="text-yellow-600 dark:text-yellow-400" />
      </div>

      {/* Cases by Owner Chart (Show for both CTRs and 8300s) */}
      {(activeTab === 'CTRs' || activeTab === '8300s') && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
              {activeTab} by Owner & Status
            </h3>
            <div className="space-y-4">
              {currentOwnerStats.map((owner) => (
                <div key={owner.name} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{owner.name}</span>
                    <span className="text-sm font-semibold dark:text-white">
                      {owner.assigned + owner.underReview + owner.submitted}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="flex h-full">
                      {owner.assigned > 0 && (
                        <div 
                          className="bg-orange-500 h-full"
                          style={{ width: `${(owner.assigned / (owner.assigned + owner.underReview + owner.submitted)) * 100}%` }}
                        />
                      )}
                      {owner.underReview > 0 && (
                        <div 
                          className="bg-red-500 h-full"
                          style={{ width: `${(owner.underReview / (owner.assigned + owner.underReview + owner.submitted)) * 100}%` }}
                        />
                      )}
                      {owner.submitted > 0 && (
                        <div 
                          className="bg-teal-500 h-full"
                          style={{ width: `${(owner.submitted / (owner.assigned + owner.underReview + owner.submitted)) * 100}%` }}
                        />
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-orange-600 dark:text-orange-400">Assigned: {owner.assigned}</span>
                    <span className="text-red-600 dark:text-red-400">Under Review: {owner.underReview}</span>
                    <span className="text-teal-600 dark:text-teal-400">Submitted: {owner.submitted}</span>
                  </div>
                </div>
              ))}
              {currentOwnerStats.length === 0 && (
                <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                  No active cases found
                </div>
              )}
            </div>
          </div>

          {/* Days Until Filing Deadline */}
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Days Until Filing Deadline</h3>
            <div className="h-64 flex items-end space-x-2">
              {daysToFile.map(({ days, count }) => (
                <div key={days} className="flex-1 flex flex-col items-center">
                  <div 
                    className={`w-full rounded-t ${
                      days <= 5 ? 'bg-red-500' : 
                      days <= 10 ? 'bg-orange-500' : 
                      'bg-green-500'
                    }`}
                    style={{ 
                      height: `${Math.min((count / Math.max(...daysToFile.map(d => d.count))) * 100, 100)}%`
                    }}
                  ></div>
                  <span className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {days < 0 ? 'Overdue' : `${days} days`}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    ({count})
                  </span>
                </div>
              ))}
              {daysToFile.length === 0 && (
                <div className="w-full text-center py-4 text-gray-500 dark:text-gray-400">
                  No pending deadlines
                </div>
              )}
            </div>
            <div className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
              Days remaining until 15-day filing deadline
            </div>
            <div className="mt-2 flex justify-center space-x-4 text-xs">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-500 rounded mr-1"></div>
                <span className="text-gray-600 dark:text-gray-400">Critical (&lt;5 days)</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-orange-500 rounded mr-1"></div>
                <span className="text-gray-600 dark:text-gray-400">Warning (&lt;10 days)</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded mr-1"></div>
                <span className="text-gray-600 dark:text-gray-400">On Track</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}