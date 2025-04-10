import React, { useState, useEffect } from 'react';
import { Play, CheckCircle, AlertCircle, Check, X, UserCheck, Users, Send, ArrowUpDown, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Case {
  id: string;
  ctr_id?: string;
  form_id?: string;
  gaming_day: string | null;
  current_owner: string | null;
  status: string;
  ship: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  embark_date: string | null;
  debark_date: string | null;
  cash_in_total: number;
  cash_out_total: number;
  folio_number?: string;
  voyage_total?: number;
  profiles?: {
    full_name: string;
  };
}

interface TeamMember {
  id: string;
  full_name: string;
}

interface CaseManagementProps {
  cases: Case[];
  onStatusChange: (id: string, newStatus: string) => void;
}

type SortField = 'gaming_day' | 'cash_in_total' | 'cash_out_total' | 'name' | 'status' | 'ship' | 'current_owner' | 'folio_number' | 'voyage_total' | null;
type SortOrder = 'asc' | 'desc';

type TabType = 'CTRs' | '8300s';

export function CaseManagement({ cases, onStatusChange }: CaseManagementProps) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedCase, setSelectedCase] = useState<string | null>(null);
  const [selectedCases, setSelectedCases] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedTeamMember, setSelectedTeamMember] = useState('');
  const [casesToAssign, setCasesToAssign] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assignLoading, setAssignLoading] = useState<{ [key: string]: boolean }>({});
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [sortedCases, setSortedCases] = useState<Case[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('CTRs');
  const [form8300s, setForm8300s] = useState<Case[]>([]);

  const activeCases = activeTab === 'CTRs' 
    ? cases.filter(caseItem => caseItem.status !== 'Approved' && caseItem.ctr_id)
    : form8300s.filter(caseItem => caseItem.status !== 'Approved' && caseItem.form_id);

  useEffect(() => {
    loadTeamMembers();
    if (activeTab === '8300s') {
      load8300s();
    }
  }, [activeTab]);

  useEffect(() => {
    sortCases();
  }, [activeCases, sortField, sortOrder]);

  const load8300s = async () => {
    try {
      const { data, error } = await supabase
        .from('form_8300s')
        .select(`
          *,
          profiles:current_owner (
            full_name
          )
        `)
        .order('gaming_day', { ascending: false });

      if (error) throw error;
      setForm8300s(data || []);
    } catch (error) {
      console.error('Error loading 8300s:', error);
      setError('Failed to load 8300s');
    }
  };

  const sortCases = () => {
    let sorted = [...activeCases];
    
    if (sortField === 'gaming_day') {
      sorted.sort((a, b) => {
        const dateA = a.gaming_day ? new Date(a.gaming_day).getTime() : 0;
        const dateB = b.gaming_day ? new Date(b.gaming_day).getTime() : 0;
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
      });
    } else if (sortField === 'cash_in_total') {
      sorted.sort((a, b) => {
        return sortOrder === 'asc' 
          ? a.cash_in_total - b.cash_in_total 
          : b.cash_in_total - a.cash_in_total;
      });
    } else if (sortField === 'cash_out_total') {
      sorted.sort((a, b) => {
        return sortOrder === 'asc' 
          ? a.cash_out_total - b.cash_out_total 
          : b.cash_out_total - a.cash_out_total;
      });
    } else if (sortField === 'name') {
      sorted.sort((a, b) => {
        const nameA = `${a.first_name} ${a.last_name}`.toLowerCase();
        const nameB = `${b.first_name} ${b.last_name}`.toLowerCase();
        return sortOrder === 'asc' 
          ? nameA.localeCompare(nameB)
          : nameB.localeCompare(nameA);
      });
    } else if (sortField === 'status') {
      sorted.sort((a, b) => {
        const statusA = a.status === 'Under Review' ? 'Under Review' : 'New';
        const statusB = b.status === 'Under Review' ? 'Under Review' : 'New';
        return sortOrder === 'asc'
          ? statusA.localeCompare(statusB)
          : statusB.localeCompare(statusA);
      });
    } else if (sortField === 'ship') {
      sorted.sort((a, b) => {
        return sortOrder === 'asc'
          ? a.ship.localeCompare(b.ship)
          : b.ship.localeCompare(a.ship);
      });
    } else if (sortField === 'current_owner') {
      sorted.sort((a, b) => {
        const ownerA = a.profiles?.full_name || '';
        const ownerB = b.profiles?.full_name || '';
        return sortOrder === 'asc'
          ? ownerA.localeCompare(ownerB)
          : ownerB.localeCompare(ownerA);
      });
    } else if (sortField === 'folio_number') {
      sorted.sort((a, b) => {
        const folioA = a.folio_number || '';
        const folioB = b.folio_number || '';
        return sortOrder === 'asc'
          ? folioA.localeCompare(folioB)
          : folioB.localeCompare(folioA);
      });
    } else if (sortField === 'voyage_total') {
      sorted.sort((a, b) => {
        const totalA = a.voyage_total || 0;
        const totalB = b.voyage_total || 0;
        return sortOrder === 'asc'
          ? totalA - totalB
          : totalB - totalA;
      });
    }

    setSortedCases(sorted);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 ml-1 text-gray-400" />;
    }
    return (
      <ArrowUpDown 
        className={`w-4 h-4 ml-1 ${
          sortField === field ? 'text-blue-500' : 'text-gray-400'
        }`} 
      />
    );
  };

  const loadTeamMembers = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('id, full_name, roles')
        .order('full_name');

      if (fetchError) throw fetchError;

      setTeamMembers(data || []);
    } catch (error) {
      console.error('Error loading team members:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssign = async (id: string, userId: string) => {
    try {
      setAssignLoading(prev => ({ ...prev, [id]: true }));
      
      const table = activeTab === 'CTRs' ? 'ctrs' : 'form_8300s';
      const idField = activeTab === 'CTRs' ? 'ctr_id' : 'form_id';

      const { error: updateError } = await supabase
        .from(table)
        .update({ 
          current_owner: userId,
          status: 'Assigned'
        })
        .eq(idField, id);

      if (updateError) throw updateError;

      onStatusChange(id, 'Assigned');

      if (activeTab === '8300s') {
        await load8300s();
      }

      setSortedCases(prev => prev.filter(c => {
        const caseId = activeTab === 'CTRs' ? c.ctr_id : c.form_id;
        return caseId !== id;
      }));

    } catch (error) {
      console.error('Error assigning case:', error);
      setError('Failed to assign case');
    } finally {
      setAssignLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleBulkAssign = async () => {
    if (!selectedTeamMember) return;

    try {
      setIsLoading(true);
      const table = activeTab === 'CTRs' ? 'ctrs' : 'form_8300s';
      const idField = activeTab === 'CTRs' ? 'ctr_id' : 'form_id';

      for (const id of casesToAssign) {
        const { error: updateError } = await supabase
          .from(table)
          .update({ 
            current_owner: selectedTeamMember,
            status: 'Assigned'
          })
          .eq(idField, id);

        if (updateError) throw updateError;
      }

      onStatusChange(casesToAssign[0], 'Assigned');

      if (activeTab === '8300s') {
        await load8300s();
      }

      setSortedCases(prev => prev.filter(c => {
        const caseId = activeTab === 'CTRs' ? c.ctr_id : c.form_id;
        return !casesToAssign.includes(caseId || '');
      }));

      setShowAssignModal(false);
      setSelectedTeamMember('');
      setCasesToAssign([]);
      setSelectedCases(new Set());
      setIsSelectionMode(false);
    } catch (error) {
      console.error('Error assigning cases:', error);
      setError('Failed to assign cases');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      if (activeTab === 'CTRs') {
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
        onStatusChange(data[0].ctr_id, data[0].status);
      } else {
        await load8300s();
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
      setError('Failed to refresh data');
    } finally {
      setIsRefreshing(false);
    }
  };

  const toggleCaseSelection = (id: string) => {
    setSelectedCases(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(id)) {
        newSelection.delete(id);
      } else {
        newSelection.add(id);
      }
      return newSelection;
    });
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid Date';
    }
  };

  const formatCurrency = (amount: number | null): string => {
    if (amount === null || amount === undefined) return '$0.00';
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(amount);
    } catch (error) {
      console.error('Error formatting currency:', error);
      return '$0.00';
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

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <div className="flex space-x-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={`inline-flex items-center px-4 py-2 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors ${
              isRefreshing ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => {
              setIsSelectionMode(!isSelectionMode);
              if (!isSelectionMode) {
                setSelectedCases(new Set());
              }
            }}
            className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            {isSelectionMode ? 'Cancel Selection' : 'Select Cases'}
          </button>
        </div>
        
        {isSelectionMode && selectedCases.size > 0 && (
          <div className="flex space-x-2">
            <button
              onClick={() => {
                setCasesToAssign(Array.from(selectedCases));
                setShowAssignModal(true);
              }}
              className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700 transition-colors"
            >
              <Users className="w-4 h-4 mr-2" />
              Assign Selected ({selectedCases.size})
            </button>
          </div>
        )}
      </div>

      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {(['CTRs', '8300s'] as const).map((tab) => (
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

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white dark:bg-gray-900 shadow-md rounded-lg overflow-hidden">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              {isSelectionMode && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Select
                </th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">ID</th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center">
                  Status
                  {getSortIcon('status')}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('gaming_day')}
              >
                <div className="flex items-center">
                  Gaming Day
                  {getSortIcon('gaming_day')}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('ship')}
              >
                <div className="flex items-center">
                  Ship
                  {getSortIcon('ship')}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center">
                  Name
                  {getSortIcon('name')}
                </div>
              </th>
              {activeTab === 'CTRs' ? (
                <>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('cash_in_total')}
                  >
                    <div className="flex items-center">
                      Cash In
                      {getSortIcon('cash_in_total')}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('cash_out_total')}
                  >
                    <div className="flex items-center">
                      Cash Out
                      {getSortIcon('cash_out_total')}
                    </div>
                  </th>
                </>
              ) : (
                <>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('folio_number')}
                  >
                    <div className="flex items-center">
                      Folio #
                      {getSortIcon('folio_number')}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Embark
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Debark
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('voyage_total')}
                  >
                    <div className="flex items-center">
                      Voyage Total
                      {getSortIcon('voyage_total')}
                    </div>
                  </th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {sortedCases.map((caseItem) => {
              const id = caseItem.ctr_id || caseItem.form_id || '';
              return (
                <tr 
                  key={id}
                  className={`hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200 ${
                    selectedCases.has(id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                >
                  {isSelectionMode && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => toggleCaseSelection(id)}
                        className={`p-2 rounded-md ${
                          selectedCases.has(id)
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 dark:bg-gray-700'
                        }`}
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap">
                    {!isSelectionMode && (
                      <div className="relative inline-block">
                        <select
                          onChange={(e) => handleAssign(id, e.target.value)}
                          className={`block w-40 pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-800 dark:text-white ${
                            assignLoading[id] ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                          defaultValue=""
                          disabled={assignLoading[id]}
                        >
                          <option value="" disabled>Assign to...</option>
                          {teamMembers.map(member => (
                            <option key={member.id} value={member.id}>
                              {member.full_name}
                            </option>
                          ))}
                        </select>
                        {assignLoading[id] && (
                          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 dark:text-blue-400 font-medium">{id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 py-1 rounded-full font-medium ${
                      caseItem.status === 'Under Review' 
                        ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' 
                        : caseItem.status === 'Assigned'
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                        : caseItem.status === 'Submitted'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                    }`}>
                      {caseItem.status === 'Under Review' 
                        ? 'Under Review' 
                        : caseItem.status === 'Assigned'
                        ? 'Assigned'
                        : caseItem.status === 'Submitted'
                        ? 'Submitted'
                        : 'New'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {formatDate(caseItem.gaming_day)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{caseItem.ship}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {`${caseItem.first_name} ${caseItem.last_name}`}
                  </td>
                  {activeTab === 'CTRs' ? (
                    <>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {formatCurrency(caseItem.cash_in_total)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {formatCurrency(caseItem.cash_out_total)}
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {caseItem.folio_number || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {formatDate(caseItem.embark_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {formatDate(caseItem.debark_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {formatCurrency(caseItem.voyage_total)}
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg w-full max-w-md">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Assign Case{casesToAssign.length > 1 ? 's' : ''}
                </h3>
                <button
                  onClick={() => {
                    setShowAssignModal(false);
                    setSelectedTeamMember('');
                    setCasesToAssign([]);
                  }}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Assign to Team Member
                </label>
                <div className="relative">
                  <select
                    value={selectedTeamMember}
                    onChange={(e) => setSelectedTeamMember(e.target.value)}
                    className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-800 dark:text-white"
                  >
                    <option value="">Select a team member</option>
                    {teamMembers.map(member => (
                      <option key={member.id} value={member.id}>
                        {member.full_name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                    <UserCheck className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowAssignModal(false);
                    setSelectedTeamMember('');
                    setCasesToAssign([]);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkAssign}
                  disabled={!selectedTeamMember || isLoading}
                  className={`px-4 py-2 text-sm font-medium text-white rounded-md ${
                    selectedTeamMember && !isLoading
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : 'bg-blue-400 cursor-not-allowed'
                  }`}
                >
                  {isLoading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                      Assigning...
                    </div>
                  ) : (
                    'Assign'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}