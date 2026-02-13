// ── Mock Data for AI Procurement Agent Prototype ──

export interface SKU {
  id: string;
  name: string;
  category: string;
  unit: string;
  currentStock: number;
  reorderPoint: number;
  safetyStock: number;
  leadTimeDays: number;
  lastPrice: number;
}

export interface Supplier {
  id: string;
  name: string;
  country: string;
  rating: number;
  categories: string[];
  paymentTerms: string;
  avgLeadDays: number;
  email: string;
}

export interface ForecastResult {
  skuId: string;
  month: string;
  predictedDemand: number;
  reorderQty: number;
  estimatedCost: number;
  confidence: number;
  rationale: string;
}

export interface PurchaseRequisition {
  id: string;
  skuId: string;
  skuName: string;
  supplierId: string;
  supplierName: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  status: 'draft' | 'pricing_requested' | 'pricing_received' | 'human_review' | 'approved' | 'po_generated' | 'po_sent';
  createdAt: string;
  rationale: string;
}

export interface PurchaseOrder {
  id: string;
  prId: string;
  supplierId: string;
  supplierName: string;
  items: { skuId: string; skuName: string; qty: number; unitPrice: number }[];
  totalAmount: number;
  status: 'generated' | 'sent' | 'acknowledged' | 'in_transit' | 'delivered' | 'completed';
  createdAt: string;
  eta?: string;
  trackingRef?: string;
}

export interface EmailThread {
  id: string;
  subject: string;
  from: string;
  to: string;
  timestamp: string;
  body: string;
  aiDisclosure: boolean;
  intent?: 'pricing_response' | 'negotiation' | 'confirmation' | 'escalation' | 'delivery_update';
  requiresHuman: boolean;
}

export interface DeliveryRecord {
  poId: string;
  status: 'pending' | 'shipped' | 'in_transit' | 'customs' | 'delivered' | 'partial';
  etd?: string;
  eta?: string;
  carrier?: string;
  trackingNo?: string;
  receivedQty?: number;
  orderedQty: number;
  grnGenerated: boolean;
}

export interface Invoice {
  id: string;
  poId: string;
  supplierName: string;
  amount: number;
  currency: string;
  dueDate: string;
  status: 'pending' | 'matched' | 'discrepancy' | 'paid';
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  module: string;
  action: string;
  actor: string;
  details: string;
  severity: 'info' | 'warning' | 'success' | 'error';
}

export interface ForwarderQuote {
  id: string;
  forwarderName: string;
  mode: 'air' | 'sea';
  cost: number;
  transitDays: number;
  status: 'pending' | 'selected' | 'rejected';
}

// ── Sample Data ──

export const SKUS: SKU[] = [
  { id: 'SKU-001', name: 'Industrial Valve Assembly', category: 'Mechanical Parts', unit: 'pcs', currentStock: 120, reorderPoint: 200, safetyStock: 80, leadTimeDays: 21, lastPrice: 245.00 },
  { id: 'SKU-002', name: 'Hydraulic Pump Unit', category: 'Mechanical Parts', unit: 'pcs', currentStock: 45, reorderPoint: 100, safetyStock: 30, leadTimeDays: 35, lastPrice: 1820.00 },
  { id: 'SKU-003', name: 'Steel Pipe 6" Schedule 40', category: 'Raw Materials', unit: 'meters', currentStock: 580, reorderPoint: 1000, safetyStock: 300, leadTimeDays: 14, lastPrice: 42.50 },
  { id: 'SKU-004', name: 'Control Panel PCB Board', category: 'Electronics', unit: 'pcs', currentStock: 200, reorderPoint: 350, safetyStock: 100, leadTimeDays: 28, lastPrice: 89.00 },
  { id: 'SKU-005', name: 'Bearing Assembly SKF-6205', category: 'Mechanical Parts', unit: 'pcs', currentStock: 800, reorderPoint: 500, safetyStock: 150, leadTimeDays: 10, lastPrice: 18.75 },
  { id: 'SKU-006', name: 'Chemical Solvent Grade A', category: 'Chemicals', unit: 'liters', currentStock: 150, reorderPoint: 400, safetyStock: 100, leadTimeDays: 18, lastPrice: 32.00 },
];

export const SUPPLIERS: Supplier[] = [
  { id: 'SUP-001', name: 'TechFlow Industries', country: 'Germany', rating: 4.5, categories: ['Mechanical Parts'], paymentTerms: 'Net 30', avgLeadDays: 21, email: 'orders@techflow.de' },
  { id: 'SUP-002', name: 'Shanghai Precision Co.', country: 'China', rating: 4.2, categories: ['Mechanical Parts', 'Raw Materials'], paymentTerms: 'Net 45', avgLeadDays: 35, email: 'sales@shanghaiprec.cn' },
  { id: 'SUP-003', name: 'Midwest Steel Supply', country: 'USA', rating: 4.7, categories: ['Raw Materials'], paymentTerms: 'Net 15', avgLeadDays: 7, email: 'procurement@midweststeel.com' },
  { id: 'SUP-004', name: 'NexGen Electronics Ltd', country: 'Taiwan', rating: 4.3, categories: ['Electronics'], paymentTerms: 'Net 30', avgLeadDays: 28, email: 'po@nexgenelec.tw' },
  { id: 'SUP-005', name: 'ChemPure International', country: 'Netherlands', rating: 4.6, categories: ['Chemicals'], paymentTerms: 'Net 60', avgLeadDays: 18, email: 'orders@chempure.nl' },
];

export const FORWARDER_QUOTES: ForwarderQuote[] = [
  { id: 'FQ-001', forwarderName: 'Kuehne+Nagel', mode: 'sea', cost: 2800, transitDays: 28, status: 'pending' },
  { id: 'FQ-002', forwarderName: 'DHL Global Forwarding', mode: 'air', cost: 6200, transitDays: 5, status: 'pending' },
  { id: 'FQ-003', forwarderName: 'Maersk Logistics', mode: 'sea', cost: 2450, transitDays: 32, status: 'pending' },
];

// ── Helper Functions ──

let auditCounter = 0;
export function createAuditEntry(module: string, action: string, actor: string, details: string, severity: AuditEntry['severity'] = 'info'): AuditEntry {
  auditCounter++;
  return {
    id: `AUD-${String(auditCounter).padStart(4, '0')}`,
    timestamp: new Date().toISOString(),
    module,
    action,
    actor,
    details,
    severity,
  };
}

export function generateForecast(sku: SKU, month: string, budget: number): ForecastResult {
  const demandMultiplier = 0.8 + Math.random() * 0.6;
  const predictedDemand = Math.round(sku.reorderPoint * demandMultiplier);
  const reorderQty = Math.max(0, predictedDemand - sku.currentStock + sku.safetyStock);
  const estimatedCost = reorderQty * sku.lastPrice;
  const confidence = 70 + Math.round(Math.random() * 25);

  return {
    skuId: sku.id,
    month,
    predictedDemand,
    reorderQty,
    estimatedCost,
    confidence,
    rationale: estimatedCost > budget
      ? `Demand forecast of ${predictedDemand} ${sku.unit} exceeds budget. Recommend partial order of ${Math.floor(budget / sku.lastPrice)} ${sku.unit} and defer remainder.`
      : `Based on 12-month rolling average and seasonal adjustment. Stock below reorder point (${sku.currentStock}/${sku.reorderPoint}). Recommend reorder of ${reorderQty} ${sku.unit}.`,
  };
}

export function generatePRId(): string {
  return `PR-${Date.now().toString(36).toUpperCase()}`;
}

export function generatePOId(): string {
  return `PO-${Date.now().toString(36).toUpperCase()}`;
}

export function generateInvoiceId(): string {
  return `INV-${Date.now().toString(36).toUpperCase()}`;
}

export function getSupplierForSKU(sku: SKU): Supplier {
  const match = SUPPLIERS.find(s => s.categories.includes(sku.category));
  return match || SUPPLIERS[0];
}

export function generateEmailThread(subject: string, from: string, to: string, body: string, intent: EmailThread['intent'], requiresHuman: boolean): EmailThread {
  return {
    id: `EM-${Date.now().toString(36).toUpperCase()}`,
    subject,
    from,
    to,
    timestamp: new Date().toISOString(),
    body,
    aiDisclosure: true,
    intent,
    requiresHuman,
  };
}

export const SUPPLIER_SCORE_METRICS = [
  { metric: 'On-Time Delivery', weight: 0.25 },
  { metric: 'Price Competitiveness', weight: 0.20 },
  { metric: 'Order Accuracy', weight: 0.20 },
  { metric: 'Response Time', weight: 0.15 },
  { metric: 'Quality Rating', weight: 0.20 },
];

export function generateSupplierScores(supplier: Supplier) {
  return SUPPLIER_SCORE_METRICS.map(m => ({
    ...m,
    score: Math.round((60 + Math.random() * 40) * 10) / 10,
  }));
}

export const KPI_DEFINITIONS = [
  { key: 'forecastAccuracy', label: 'Forecast Accuracy', format: 'percent' },
  { key: 'avgCycleTime', label: 'Avg Cycle Time', format: 'days' },
  { key: 'costSavings', label: 'Cost Savings', format: 'currency' },
  { key: 'supplierSLA', label: 'Supplier SLA', format: 'percent' },
  { key: 'automationRate', label: 'Automation Rate', format: 'percent' },
  { key: 'posPending', label: 'POs Pending', format: 'number' },
];

export function generateKPIs() {
  return {
    forecastAccuracy: 82 + Math.round(Math.random() * 12),
    avgCycleTime: 8 + Math.round(Math.random() * 7),
    costSavings: 12400 + Math.round(Math.random() * 8000),
    supplierSLA: 88 + Math.round(Math.random() * 10),
    automationRate: 62 + Math.round(Math.random() * 20),
    posPending: Math.round(Math.random() * 5),
  };
}