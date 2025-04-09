export interface Case {
  id: string;
  ctr_id: string;
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
  recommendation?: string | null;
  approver?: string | null;
  folio_number?: string;
  voyage_total?: number;
  profiles?: {
    full_name: string;
  };
}

export interface TeamMember {
  id: string;
  full_name: string;
  roles: string[];
}

export interface CaseFile {
  id: string;
  name: string;
  size: number;
  lastModified: string;
  type: string;
  file_path: string;
}