import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { FileText, ArrowLeft, Eye, CheckCircle, Play, Check, X, Users, ArrowUpDown, RefreshCw } from 'lucide-react';
import { sortCases } from '../lib/sorting';
import type { SortField, SortOrder } from '../lib/sorting';

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

export function MyCases() {
  const [cases, setCases] = useState<Case[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unassignLoading, setUnassignLoading] = useState<{ [key: string]: boolean }>({});
  const [reviewLoading, setReviewLoading] = useState<{ [key: string]: boolean }>({});
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedCases, setSelectedCases] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [sortedCases, setSortedCases] = useState<Case[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'CTRs' | '8300s'>('CTRs');

  useEffect(() => {
    loadMyCases();
  }, [activeTab]);

  useEffect(() => {
    setSortedCases(sortCases(cases, sortField, sortOrder));
  }, [cases, sortField, sortOrder]);

  const loadMyCases = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      const table = activeTab === 'CTRs' ? 'ctrs' : 'form_8300s';
      const idField = activeTab === 'CTRs' ? 'ctr_id' : 'form_id';

      const { data, error } = await supabase
        .from(table)
        .select(`
          *,
          profiles:current_owner (
            full_name
          )
        `)
        .eq('current_owner', user.id)
        .eq('status', 'Assigned')
        .order('gaming_day', { ascending: false });

      if (error) throw error;
      setCases(data || []);
    } catch (error) {
      console.error('Error loading cases:', error);
      setError('Failed to load cases');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnassign = async (ids: string[]) => {
    try {
      setUnassignLoading(prev => 
        ids.reduce((acc, id) => ({ ...acc, [id]: true }), prev)
      );

      const table = activeTab === 'CTRs' ? 'ctrs' : 'form_8300s';
      const idField = activeTab === 'CTRs' ? 'ctr_id' : 'form_id';

      for (const id of ids) {
        const { error } = await supabase
          .from(table)
          .update({ 
            current_owner: null,
            status: 'New'
          })
          .eq(idField, id);

        if (error) throw error;
      }

      // Remove unassigned cases from the list
      setCases(prev => prev.filter(c => {
        const caseId = activeTab === 'CTRs' ? c.ctr_id : c.form_id;
        return !ids.includes(caseId || '');
      }));
      
      setSelectedCases(new Set());
      setIsSelectionMode(false);
    } catch (error) {
      console.error('Error unassigning cases:', error);
      setError('Failed to unassign cases');
    } finally {
      setUnassignLoading(prev => 
        ids.reduce((acc, id) => ({ ...acc, [id]: false }), prev)
      );
    }
  };

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      await loadMyCases();
    } catch (error) {
      console.error('Error refreshing data:', error);
      setError('Failed to refresh data');
    } finally {
      setIsRefreshing(false);
    }
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

  const handleReview = async (ids: string[]) => {
    try {
      setReviewLoading(prev => 
        ids.reduce((acc, id) => ({ ...acc, [id]: true }), prev)
      );

      const table = activeTab === 'CTRs' ? 'ctrs' : 'form_8300s';
      const idField = activeTab === 'CTRs' ? 'ctr_id' : 'form_id';

      for (const id of ids) {
        const { error } = await supabase
          .from(table)
          .update({ status: 'Under Review' })
          .eq(idField, id);

        if (error) throw error;
      }

      setCases(prev => prev.filter(c => !ids.includes(c.ctr_id || c.form_id || '')));
      setSelectedCases(new Set());
      setIsSelectionMode(false);
    } catch (error) {
      console.error('Error starting review:', error);
      setError('Failed to start review');
    } finally {
      setReviewLoading(prev => 
        ids.reduce((acc, id) => ({ ...acc, [id]: false }), prev)
      );
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
              onClick={() => handleReview(Array.from(selectedCases))}
              className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              <Play className="w-4 h-4 mr-2" />
              Review Selected ({selectedCases.size})
            </button>
            <button
              onClick={() => handleUnassign(Array.from(selectedCases))}
              className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Unassign Selected ({selectedCases.size})
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
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
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleReview([id])}
                          disabled={reviewLoading[id]}
                          className={`inline-flex items-center px-3 py-1 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors ${
                            reviewLoading[id] ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        >
                          {reviewLoading[id] ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                          ) : (
                            <>
                              <Play className="w-4 h-4 mr-1" />
                              Review
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleUnassign([id])}
                          disabled={unassignLoading[id]}
                          className={`inline-flex items-center px-3 py-1 rounded-md text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 transition-colors ${
                            unassignLoading[id] ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        >
                          {unassignLoading[id] ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                          ) : (
                            <>
                              <ArrowLeft className="w-4 h-4 mr-1" />
                              Unassign
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 dark:text-blue-400 font-medium">
                    {id}
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
    </div>
  );
}