import { Case } from '../types';

export type SortField = 'gaming_day' | 'cash_in_total' | 'cash_out_total' | 'name' | 'status' | 'ship' | 'current_owner' | 'recommendation' | 'folio_number' | 'voyage_total' | null;
export type SortOrder = 'asc' | 'desc';

export function sortCases(cases: Case[], sortField: SortField, sortOrder: SortOrder): Case[] {
  const sorted = [...cases];
  
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
      return sortOrder === 'asc'
        ? a.status.localeCompare(b.status)
        : b.status.localeCompare(a.status);
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
  } else if (sortField === 'recommendation') {
    sorted.sort((a, b) => {
      const recA = a.recommendation || '';
      const recB = b.recommendation || '';
      return sortOrder === 'asc'
        ? recA.localeCompare(recB)
        : recB.localeCompare(recA);
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

  return sorted;
}