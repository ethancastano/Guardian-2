import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  FileText,
  ClipboardList,
  Search,
  BarChart,
  Settings,
  Shield,
  ChevronLeft,
  ChevronRight,
  Users,
  Sun,
  Moon,
  CheckCircle,
  Folder,
  Database,
  ExternalLink,
  ThumbsUp,
  LogOut,
  Archive as ArchiveIcon
} from 'lucide-react';
import { CaseManagement } from './components/CaseManagement';
import { DashboardStats } from './components/DashboardStats';
import { UnderReview } from './components/UnderReview';
import { SubmittedCases } from './components/SubmittedCases';
import { Team } from './components/Team';
import { Settings as SettingsComponent } from './components/Settings';
import { Auth } from './components/Auth';
import { getCurrentUser, signOut } from './lib/auth';
import { supabase } from './lib/supabase';
import { MyCases } from './components/MyCases';
import { Database as DatabaseComponent } from './components/Database';
import { Recommendation } from './components/Recommendation';
import { Archive } from './components/Archive';

interface Case {
  id: string;
  ctr_id: string;
  gaming_day: string;
  current_owner: string | null;
  status: string;
  ship: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  embark_date: string;
  debark_date: string;
  cash_in_total: number;
  cash_out_total: number;
  profiles?: {
    full_name: string;
  };
}

interface ExternalTool {
  name: string;
  url: string;
  description: string;
}

function App() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedMode = localStorage.getItem('darkMode');
    return savedMode ? JSON.parse(savedMode) : false;
  });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [cases, setCases] = useState<Case[]>([]);

  const externalTools: Record<string, ExternalTool> = {
    'DASH': {
      name: 'DASH Portal',
      url: 'https://cclnavigator.carnival.com/guestsearch/#/guestsearch',
      description: 'Access the DASH guest search system'
    },
    'CMAS': {
      name: 'CMAS System',
      url: 'https://cclprdcmas1.carnival.com/',
      description: 'Access the CMAS management system'
    },
    'Lexis': {
      name: 'Lexis Portal',
      url: 'https://signin.lexisnexis.com/lnaccess/app/signin?back=https%3A%2F%2Fadvance.lexis.com%3A443%2F&aci=la',
      description: 'Access the Lexis research portal'
    },
    'VIP Search': {
      name: 'VIP Search',
      url: 'https://cclprdtblcas.carnival.com/#/views/VIPServices-PlayerRatings/SearchbyName',
      description: 'Access the VIP Services Player Ratings search'
    }
  };

  useEffect(() => {
    checkAuth();
    loadCases();
  }, []);

  const checkAuth = async () => {
    try {
      const user = await getCurrentUser();
      setIsAuthenticated(!!user);
    } catch (error) {
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCases = async () => {
    try {
      const { data, error } = await supabase
        .from('ctrs')
        .select(`
          *,
          profiles:current_owner (
            full_name
          )
        `)
        .order('gaming_day', { ascending: false });

      if (error) throw error;
      setCases(data || []);
    } catch (error) {
      console.error('Error loading cases:', error);
    }
  };

  const handleStatusChange = async (ctrId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('ctrs')
        .update({ status: newStatus })
        .eq('ctr_id', ctrId);

      if (error) throw error;
      await loadCases();
    } catch (error) {
      console.error('Error updating case status:', error);
    }
  };

  const handleExternalToolClick = (toolName: string) => {
    const tool = externalTools[toolName];
    if (tool) {
      window.open(tool.url, '_blank', 'noopener,noreferrer');
    }
    setActiveTab('Dashboard');
  };

  const handleLogout = async () => {
    try {
      await signOut();
      setIsAuthenticated(false);
      setActiveTab('Dashboard');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard },
    { name: 'Case Management', icon: FileText },
    { name: 'My Cases', icon: Folder },
    { name: 'Under Review', icon: ClipboardList },
    { name: 'Submitted Cases', icon: CheckCircle },
    { name: 'Recommendation', icon: ThumbsUp },
    { name: 'Database', icon: Database },
    { name: 'Archive', icon: ArchiveIcon },
    { name: 'DASH', icon: BarChart },
    { name: 'VIP Search', icon: Search },
    { name: 'Lexis', icon: Search },
    { name: 'CMAS', icon: Users },
    { name: 'Team', icon: Users },
    { name: 'Settings', icon: Settings },
  ];

  const handleMenuClick = (itemName: string) => {
    if (externalTools[itemName]) {
      handleExternalToolClick(itemName);
    } else {
      setActiveTab(itemName);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="text-gray-600 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Auth onAuthSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className={`flex h-screen ${isDarkMode ? 'dark' : ''}`}>
      {/* Sidebar */}
      <div className={`bg-[#1a2234] dark:bg-gray-900 ${isCollapsed ? 'w-20' : 'w-64'} transition-all duration-300 ease-in-out flex flex-col`}>
        {/* Logo Section */}
        <div className="flex items-center p-4 border-b border-gray-700">
          <Shield className="text-purple-400 h-8 w-8" />
          {!isCollapsed && (
            <span className="text-white text-xl font-semibold ml-2">Sentinel 2.0</span>
          )}
          <button
            className="ml-auto text-gray-400 hover:text-white"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 mt-6">
          {menuItems.map((item) => (
            <button
              key={item.name}
              className={`flex items-center w-full p-4 text-gray-300 hover:bg-purple-600 hover:bg-opacity-25 transition-colors ${
                activeTab === item.name ? 'bg-purple-600 bg-opacity-25 text-white' : ''
              }`}
              onClick={() => handleMenuClick(item.name)}
            >
              <item.icon className="h-5 w-5" />
              {!isCollapsed && (
                <span className="ml-4 flex items-center">
                  {item.name}
                  {externalTools[item.name] && (
                    <ExternalLink className="h-3 w-3 ml-2" />
                  )}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Logout Button */}
        <div className="border-t border-gray-700 p-4">
          <button
            onClick={handleLogout}
            className="flex items-center w-full p-2 text-gray-300 hover:bg-purple-600 hover:bg-opacity-25 transition-colors rounded"
          >
            <LogOut className="h-5 w-5" />
            {!isCollapsed && <span className="ml-4">Logout</span>}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto bg-gray-100 dark:bg-gray-800 transition-colors duration-200">
        {/* Header */}
        <header className="bg-white dark:bg-gray-900 shadow-sm">
          <div className="px-6 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-semibold text-gray-800 dark:text-white">{activeTab}</h1>
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              {isDarkMode ? (
                <Sun className="h-5 w-5 text-yellow-500" />
              ) : (
                <Moon className="h-5 w-5 text-gray-600" />
              )}
            </button>
          </div>
        </header>

        {/* Content Area */}
        <main className="p-6">
          {activeTab === 'Dashboard' && <DashboardStats />}
          {activeTab === 'Case Management' && <CaseManagement cases={cases} onStatusChange={handleStatusChange} />}
          {activeTab === 'My Cases' && <MyCases />}
          {activeTab === 'Under Review' && <UnderReview cases={cases} onStatusChange={handleStatusChange} />}
          {activeTab === 'Submitted Cases' && <SubmittedCases cases={cases} onStatusChange={handleStatusChange} />}
          {activeTab === 'Recommendation' && <Recommendation />}
          {activeTab === 'Database' && <DatabaseComponent />}
          {activeTab === 'Archive' && <Archive />}
          {activeTab === 'Team' && <Team />}
          {activeTab === 'Settings' && <SettingsComponent />}
        </main>
      </div>
    </div>
  );
}

export default App;