import { Types } from "mongoose";

// Query parameters for Cash Ledger Report
export interface CashLedgerQueryParams {
  venueId: string;
  startDate?: string;
  endDate?: string;
  paymentMode?: "cash" | "card" | "upi" | "bank_transfer" | "cheque" | "other";
}

// Query parameters for Income & Expenditure Report
export interface IncomeExpenditureQueryParams {
  venueId: string;
  startDate: string;
  endDate: string;
  groupBy?: "service" | "month" | "occasionType";
}

// Cash Ledger Report Types
export interface PaymentModeSummary {
  received: number;
  pending: number;
}

export interface CashLedgerSummary {
  totalReceived: number;
  totalPending: number;
  byPaymentMode: {
    cash: PaymentModeSummary;
    upi: PaymentModeSummary;
    bank_transfer: PaymentModeSummary;
    card: PaymentModeSummary;
    cheque: PaymentModeSummary;
    other: PaymentModeSummary;
  };
}

export interface DebtorInfo {
  bookingId: Types.ObjectId;
  clientName: string;
  contactNo: string;
  email: string;
  totalAmount: number;
  advanceAmount: number;
  pendingAmount: number;
  eventDate: Date;
  paymentMode: string;
  occasionType: string;
  discount?: {
    amount: number;
    note?: string;
  };
  gstCalculation?: {
    enabled: boolean;
    food?: { rate: number; taxableAmount: number; gstAmount: number };
    services?: { rate: number; taxableAmount: number; gstAmount: number };
    totalGST: number;
    grandTotal: number;
  };
}

export interface CreditorInfo {
  bookingId: Types.ObjectId;
  serviceName: string;
  vendorName?: string;
  amountDue: number;
  eventDate: Date;
  bankDetails?: {
    accountNumber?: string;
    accountHolderName?: string;
    ifscCode?: string;
    bankName?: string;
    branchName?: string;
    upiId?: string;
  };
  // PurchaseOrder specific fields
  poNumber?: string;
  poTotalAmount?: number;
  poPaidAmount?: number;
  poStatus?: string;
  vendorType?: "catering" | "service";
}

export interface CashLedgerReportData {
  summary: CashLedgerSummary;
  debtors: DebtorInfo[];
  creditors: CreditorInfo[];
}

export interface CashLedgerReportResponse {
  success: boolean;
  data: CashLedgerReportData;
}

// Income & Expenditure Report Types
export interface IncomeExpenditureSummary {
  totalIncome: number;
  totalExpenditure: number;
  netProfit: number;
}

export interface BreakdownItem {
  category: string;
  categoryType: "venue_charges" | "service" | "occasion";
  income: number;
  expenditure: number;
  net: number;
  bookingsCount: number;
}

export interface ReportPeriod {
  startDate: string;
  endDate: string;
}

export interface IncomeExpenditureReportData {
  summary: IncomeExpenditureSummary;
  breakdown: BreakdownItem[];
  period: ReportPeriod;
}

export interface IncomeExpenditureReportResponse {
  success: boolean;
  data: IncomeExpenditureReportData;
}
