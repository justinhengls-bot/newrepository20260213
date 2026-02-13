import { useState, useCallback, useRef, useEffect } from 'react';
import './App.css';
import {
  BarChart3, TrendingUp, FileText, Mail, Truck, CreditCard,
  CheckCircle2, AlertTriangle, Clock, Play, User, Shield,
  Package, Send, Eye, Download, RefreshCw, ArrowRight,
  Zap, Target, DollarSign, Activity, Star, Search,
  ChevronDown, ChevronRight, X, Bell, Settings, Ship,
  Users, Globe, Award, Layers
} from 'lucide-react';
import {
  type SKU, type Supplier, type ForecastResult, type PurchaseRequisition,
  type PurchaseOrder, type EmailThread, type DeliveryRecord, type Invoice,
  type AuditEntry, type ForwarderQuote,
  SKUS, SUPPLIERS, FORWARDER_QUOTES,
  generateForecast, generatePRId, generatePOId, generateInvoiceId,
  getSupplierForSKU, generateEmailThread, createAuditEntry,
  SUPPLIER_SCORE_METRICS, generateSupplierScores, generateKPIs,
  KPI_DEFINITIONS,
} from './data/mockData';

// ── Workflow Stages ──
type WorkflowStage = 'forecast' | 'pr_generation' | 'approval' | 'supplier_comms' | 'logistics' | 'delivery' | 'payment' | 'complete';
const STAGE_ORDER: WorkflowStage[] = ['forecast', 'pr_generation', 'approval', 'supplier_comms', 'logistics', 'delivery', 'payment', 'complete'];
const STAGE_LABELS: Record<WorkflowStage, string> = {
  forecast: 'Forecasting',
  pr_generation: 'PR/PO Generation',
  approval: 'Approval Workflow',
  supplier_comms: 'Supplier Communication',
  logistics: 'Logistics & Forwarders',
  delivery: 'Delivery Tracking',
  payment: 'Payment & Settlement',
  complete: 'Complete',
};

function formatCurrency(n: number) { return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function formatDate(iso: string) { return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
function formatPercent(n: number) { return n + '%'; }

function App() {
  // ── Global State ──
  const [activeStage, setActiveStage] = useState<WorkflowStage>('forecast');
  const [activeTab, setActiveTab] = useState<'workflow' | 'dashboard' | 'audit'>('workflow');
  const [kpis, setKpis] = useState(generateKPIs);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [notifications, setNotifications] = useState<string[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // ── Forecast State ──
  const [selectedSku, setSelectedSku] = useState<string>(SKUS[0].id);
  const [selectedMonth, setSelectedMonth] = useState('March 2026');
  const [budget, setBudget] = useState(25000);
  const [forecastResult, setForecastResult] = useState<ForecastResult | null>(null);

  // ── PR/PO State ──
  const [prs, setPrs] = useState<PurchaseRequisition[]>([]);
  const [pos, setPos] = useState<PurchaseOrder[]>([]);

  // ── Email State ──
  const [emails, setEmails] = useState<EmailThread[]>([]);

  // ── Approval State ──
  const [userRole, setUserRole] = useState<'manager' | 'director'>('manager');
  const [threshold, setThreshold] = useState(5);
  const [approvalQueue, setApprovalQueue] = useState<string[]>([]);
  const [selectedApproval, setSelectedApproval] = useState<string>('');

  // ── Logistics State ──
  const [forwarderQuotes, setForwarderQuotes] = useState<ForwarderQuote[]>([]);
  const [selectedForwarder, setSelectedForwarder] = useState<string>('');

  // ── Delivery State ──
  const [deliveries, setDeliveries] = useState<DeliveryRecord[]>([]);

  // ── Payment State ──
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [matchResult, setMatchResult] = useState<string>('');
  const [paymentTermChoice, setPaymentTermChoice] = useState<'partial' | 'full_pre' | 'full_sight'>('full_sight');

  // ── Supplier Score ──
  const [supplierScores, setSupplierScores] = useState<{ metric: string; weight: number; score: number }[]>([]);

  // ── Demo ──
  const [demoRunning, setDemoRunning] = useState(false);
  const demoRef = useRef(false);

  const addAudit = useCallback((module: string, action: string, actor: string, details: string, severity: AuditEntry['severity'] = 'info') => {
    const entry = createAuditEntry(module, action, actor, details, severity);
    setAuditLog(prev => [entry, ...prev]);
    return entry;
  }, []);

  const addNotification = useCallback((msg: string) => {
    setNotifications(prev => [msg, ...prev].slice(0, 20));
  }, []);

  // ── Workflow Actions ──

  const handleForecast = useCallback(() => {
    const sku = SKUS.find(s => s.id === selectedSku)!;
    const result = generateForecast(sku, selectedMonth, budget);
    setForecastResult(result);
    addAudit('Forecasting', 'Forecast Generated', 'AI Engine', `SKU ${sku.name}: predicted demand ${result.predictedDemand} ${sku.unit}, reorder qty ${result.reorderQty}, est. cost ${formatCurrency(result.estimatedCost)} (${result.confidence}% confidence)`);
    addNotification(`Forecast ready for ${sku.name}`);
    setKpis(prev => ({ ...prev, forecastAccuracy: result.confidence }));
  }, [selectedSku, selectedMonth, budget, addAudit, addNotification]);

  const handleCreatePR = useCallback(() => {
    if (!forecastResult) return;
    const sku = SKUS.find(s => s.id === forecastResult.skuId)!;
    const supplier = getSupplierForSKU(sku);
    const pr: PurchaseRequisition = {
      id: generatePRId(),
      skuId: sku.id,
      skuName: sku.name,
      supplierId: supplier.id,
      supplierName: supplier.name,
      quantity: forecastResult.reorderQty,
      unitPrice: sku.lastPrice,
      totalAmount: forecastResult.estimatedCost,
      status: 'draft',
      createdAt: new Date().toISOString(),
      rationale: forecastResult.rationale,
    };
    setPrs(prev => [pr, ...prev]);
    setApprovalQueue(prev => [pr.id, ...prev]);
    addAudit('PR/PO Service', 'Draft PR Created', 'AI Engine', `${pr.id}: ${pr.skuName} x ${pr.quantity} from ${pr.supplierName} — ${formatCurrency(pr.totalAmount)}`);
    addNotification(`Draft PR ${pr.id} created`);
    setActiveStage('pr_generation');
  }, [forecastResult, addAudit, addNotification]);

  const handleRequestPricing = useCallback(() => {
    if (prs.length === 0) return;
    const pr = prs[0];
    const supplier = SUPPLIERS.find(s => s.id === pr.supplierId)!;
    const email = generateEmailThread(
      `RFQ: ${pr.skuName} — ${pr.quantity} units`,
      'procurement@orderpilot.ai',
      supplier.email,
      `Dear ${supplier.name},\n\nWe are requesting an updated quote for:\n• Item: ${pr.skuName}\n• Quantity: ${pr.quantity} ${SKUS.find(s => s.id === pr.skuId)!.unit}\n• Delivery: Within ${supplier.avgLeadDays} days\n\nPlease provide your best pricing and payment terms.\n\n[AI Disclosure: This message was composed by an AI procurement assistant. To speak with a human representative, reply with "ESCALATE" or click the link below.]\n\nBest regards,\nOrderPilot Procurement Agent`,
      'pricing_response',
      false
    );
    setEmails(prev => [email, ...prev]);
    setPrs(prev => prev.map(p => p.id === pr.id ? { ...p, status: 'pricing_requested' as const } : p));
    addAudit('Email Agent', 'Pricing Request Sent', 'AI Engine', `RFQ sent to ${supplier.name} (${supplier.email}) for ${pr.skuName}`, 'info');
    addNotification(`Pricing request sent to ${supplier.name}`);

    // Simulate supplier response after brief delay
    setTimeout(() => {
      const newPrice = pr.unitPrice * (0.92 + Math.random() * 0.12);
      const responseEmail = generateEmailThread(
        `RE: RFQ: ${pr.skuName} — ${pr.quantity} units`,
        supplier.email,
        'procurement@orderpilot.ai',
        `Dear OrderPilot,\n\nThank you for your inquiry. Our updated pricing:\n• Unit Price: ${formatCurrency(newPrice)}\n• Payment Terms: ${supplier.paymentTerms}\n• Lead Time: ${supplier.avgLeadDays} business days\n• MOQ: ${Math.round(pr.quantity * 0.5)} units\n\nWe look forward to your order.\n\nBest regards,\n${supplier.name} Sales Team`,
        'pricing_response',
        false
      );
      setEmails(prev => [responseEmail, ...prev]);
      setPrs(prev => prev.map(p => p.id === pr.id ? { ...p, status: 'pricing_received' as const, unitPrice: Math.round(newPrice * 100) / 100, totalAmount: Math.round(newPrice * p.quantity * 100) / 100 } : p));
      addAudit('Email Agent', 'Pricing Response Received', 'AI Classifier', `${supplier.name} quoted ${formatCurrency(newPrice)}/unit — intent classified as "pricing_response"`, 'success');
      addNotification(`Pricing received from ${supplier.name}: ${formatCurrency(newPrice)}/unit`);
    }, 1500);
  }, [prs, addAudit, addNotification]);

  const handleHumanSignoff = useCallback(() => {
    if (prs.length === 0) return;
    const pr = prs[0];
    setPrs(prev => prev.map(p => p.id === pr.id ? { ...p, status: 'human_review' as const } : p));
    addAudit('Human Interface', 'Pricing Sign-off', 'Procurement Manager', `Reviewed and approved pricing for ${pr.skuName}: ${formatCurrency(pr.unitPrice)}/unit — total ${formatCurrency(pr.totalAmount)}`, 'success');
    addNotification(`Pricing approved for ${pr.skuName}`);
    setActiveStage('approval');
  }, [prs, addAudit, addNotification]);

  const handleRouteApproval = useCallback(() => {
    if (approvalQueue.length === 0) return;
    const prId = approvalQueue[0];
    const pr = prs.find(p => p.id === prId);
    if (!pr) return;
    const variance = ((pr.unitPrice - SKUS.find(s => s.id === pr.skuId)!.lastPrice) / SKUS.find(s => s.id === pr.skuId)!.lastPrice * 100);
    const approver = Math.abs(variance) > threshold ? 'Company Director' : 'Purchase Manager';
    addAudit('Approval Workflow', 'Routed for Approval', 'System', `${pr.id} routed to ${approver} — price variance ${variance.toFixed(1)}% (threshold: ${threshold}%)`, Math.abs(variance) > threshold ? 'warning' : 'info');
    addNotification(`${pr.id} routed to ${approver} for approval`);
  }, [approvalQueue, prs, threshold, addAudit, addNotification]);

  const handleApprove = useCallback(() => {
    const prId = selectedApproval || (approvalQueue.length > 0 ? approvalQueue[0] : '');
    if (!prId) return;
    const pr = prs.find(p => p.id === prId);
    if (!pr) return;

    setPrs(prev => prev.map(p => p.id === prId ? { ...p, status: 'approved' as const } : p));
    setApprovalQueue(prev => prev.filter(id => id !== prId));

    // Generate PO
    const po: PurchaseOrder = {
      id: generatePOId(),
      prId,
      supplierId: pr.supplierId,
      supplierName: pr.supplierName,
      items: [{ skuId: pr.skuId, skuName: pr.skuName, qty: pr.quantity, unitPrice: pr.unitPrice }],
      totalAmount: pr.totalAmount,
      status: 'generated',
      createdAt: new Date().toISOString(),
    };
    setPos(prev => [po, ...prev]);
    setPrs(prev => prev.map(p => p.id === prId ? { ...p, status: 'po_generated' as const } : p));

    addAudit('Approval Workflow', 'PR Approved', userRole === 'manager' ? 'Purchase Manager' : 'Company Director', `${prId} approved — PO ${po.id} generated`, 'success');
    addAudit('PR/PO Service', 'PO Generated', 'System', `${po.id}: ${formatCurrency(po.totalAmount)} for ${pr.supplierName}`, 'success');
    addNotification(`PO ${po.id} generated from approved PR ${prId}`);
    setActiveStage('supplier_comms');
  }, [selectedApproval, approvalQueue, prs, userRole, addAudit, addNotification]);

  const handleSendPO = useCallback(() => {
    if (pos.length === 0) return;
    const po = pos[0];
    const supplier = SUPPLIERS.find(s => s.id === po.supplierId)!;
    const email = generateEmailThread(
      `Purchase Order ${po.id} — ${po.items.map(i => i.skuName).join(', ')}`,
      'procurement@orderpilot.ai',
      supplier.email,
      `Dear ${supplier.name},\n\nPlease find attached Purchase Order ${po.id}:\n\n${po.items.map(i => `• ${i.skuName}: ${i.qty} units @ ${formatCurrency(i.unitPrice)} = ${formatCurrency(i.qty * i.unitPrice)}`).join('\n')}\n\nTotal: ${formatCurrency(po.totalAmount)}\n\nPlease confirm receipt and expected delivery date.\n\n[AI Disclosure: This message was composed by an AI procurement assistant. To speak with a human, reply "ESCALATE".]\n\nBest regards,\nOrderPilot Procurement Agent`,
      'confirmation',
      false
    );
    setEmails(prev => [email, ...prev]);
    setPos(prev => prev.map(p => p.id === po.id ? { ...p, status: 'sent' as const } : p));
    addAudit('Email Agent', 'PO Sent', 'AI Engine', `PO ${po.id} sent to ${supplier.name}`, 'info');
    addNotification(`PO ${po.id} sent to ${supplier.name}`);
  }, [pos, addAudit, addNotification]);

  const handleSupplierEscalation = useCallback(() => {
    if (pos.length === 0) return;
    const po = pos[0];
    const supplier = SUPPLIERS.find(s => s.id === po.supplierId)!;
    const email = generateEmailThread(
      `RE: Purchase Order ${po.id} — Request for Human Contact`,
      supplier.email,
      'procurement@orderpilot.ai',
      `Dear OrderPilot,\n\nWe appreciate the order but would like to discuss payment terms and delivery schedule with a human representative before confirming.\n\nPlease have your procurement team contact us.\n\nRegards,\n${supplier.name}`,
      'escalation',
      true
    );
    setEmails(prev => [email, ...prev]);
    addAudit('Email Agent', 'Human Escalation Triggered', 'AI Classifier', `${supplier.name} requested human contact for PO ${po.id} — intent: "escalation"`, 'warning');
    addNotification(`${supplier.name} requests human contact — escalation required`);
  }, [pos, addAudit, addNotification]);

  const handleRequestForwarderQuotes = useCallback(() => {
    setForwarderQuotes(FORWARDER_QUOTES.map(q => ({ ...q, status: 'pending' as const })));
    addAudit('Logistics Optimizer', 'Forwarder Quotes Requested', 'AI Engine', `Requested quotes from ${FORWARDER_QUOTES.length} forwarders (air + sea options)`, 'info');
    addNotification('Forwarder quotes requested from 3 providers');
    FORWARDER_QUOTES.forEach(q => {
      const email = generateEmailThread(
        `Quote Request: Freight Forwarding — PO Shipment`,
        'logistics@orderpilot.ai',
        `quotes@${q.forwarderName.toLowerCase().replace(/[+\s]/g, '')}.com`,
        `Dear ${q.forwarderName},\n\nWe require freight forwarding services for an upcoming shipment. Please provide your best quote.\n\n[AI Disclosure: This is an automated request.]\n\nBest regards,\nOrderPilot`,
        'confirmation',
        false
      );
      setEmails(prev => [email, ...prev]);
    });
    setActiveStage('logistics');
  }, [addAudit, addNotification]);

  const handleSelectForwarder = useCallback(() => {
    const fId = selectedForwarder || (forwarderQuotes.length > 0 ? forwarderQuotes[0].id : '');
    if (!fId) return;
    const fq = forwarderQuotes.find(q => q.id === fId)!;
    setForwarderQuotes(prev => prev.map(q => ({ ...q, status: q.id === fId ? 'selected' as const : 'rejected' as const })));
    addAudit('Logistics Optimizer', 'Forwarder Selected', 'Procurement Manager', `Selected ${fq.forwarderName} (${fq.mode}) — ${formatCurrency(fq.cost)}, ${fq.transitDays} days`, 'success');
    addNotification(`Forwarder selected: ${fq.forwarderName}`);
    setActiveStage('delivery');

    // Create delivery record
    if (pos.length > 0) {
      const po = pos[0];
      const delivery: DeliveryRecord = {
        poId: po.id,
        status: 'pending',
        orderedQty: po.items.reduce((sum, i) => sum + i.qty, 0),
        grnGenerated: false,
        carrier: fq.forwarderName,
      };
      setDeliveries(prev => [delivery, ...prev]);
    }
  }, [selectedForwarder, forwarderQuotes, pos, addAudit, addNotification]);

  const handleSyncDelivery = useCallback(() => {
    if (deliveries.length === 0) return;
    const d = deliveries[0];
    const statuses: DeliveryRecord['status'][] = ['shipped', 'in_transit', 'customs', 'delivered'];
    const currentIdx = statuses.indexOf(d.status as any);
    const nextStatus = statuses[Math.min(currentIdx + 1, statuses.length - 1)] || 'shipped';
    const eta = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    setDeliveries(prev => prev.map((del, i) => i === 0 ? { ...del, status: nextStatus, eta, trackingNo: del.trackingNo || 'TRK-' + Math.random().toString(36).substring(2, 8).toUpperCase() } : del));
    addAudit('Delivery Tracker', 'Status Synced', 'System', `PO ${d.poId}: status updated to "${nextStatus}" — ETA: ${eta}`, 'info');
    addNotification(`Delivery status: ${nextStatus}`);
  }, [deliveries, addAudit, addNotification]);

  const handlePartialDelivery = useCallback(() => {
    if (deliveries.length === 0) return;
    const d = deliveries[0];
    const received = Math.round(d.orderedQty * 0.7);
    setDeliveries(prev => prev.map((del, i) => i === 0 ? { ...del, status: 'partial' as const, receivedQty: received } : del));
    addAudit('Delivery Tracker', 'Partial Delivery Recorded', 'Warehouse', `Received ${received}/${d.orderedQty} units — ${d.orderedQty - received} units outstanding`, 'warning');
    addNotification(`Partial delivery: ${received}/${d.orderedQty} units received`);
  }, [deliveries, addAudit, addNotification]);

  const handleGenerateGRN = useCallback(() => {
    if (deliveries.length === 0) return;
    const d = deliveries[0];
    setDeliveries(prev => prev.map((del, i) => i === 0 ? { ...del, grnGenerated: true, status: 'delivered' as const, receivedQty: del.receivedQty || del.orderedQty } : del));
    addAudit('Delivery Tracker', 'GRN Generated', 'Warehouse', `GRN for PO ${d.poId}: ${d.receivedQty || d.orderedQty}/${d.orderedQty} units confirmed`, 'success');
    addNotification(`GRN generated for PO ${d.poId}`);
    setActiveStage('payment');
  }, [deliveries, addAudit, addNotification]);

  const handleImportInvoice = useCallback(() => {
    if (pos.length === 0) return;
    const po = pos[0];
    const inv: Invoice = {
      id: generateInvoiceId(),
      poId: po.id,
      supplierName: po.supplierName,
      amount: po.totalAmount * (0.98 + Math.random() * 0.04),
      currency: 'USD',
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'pending',
    };
    setInvoices(prev => [inv, ...prev]);
    addAudit('Payment & Reconciliation', 'Invoice Imported', 'System', `${inv.id}: ${formatCurrency(inv.amount)} from ${inv.supplierName} — due ${inv.dueDate}`, 'info');
    addNotification(`Invoice ${inv.id} imported`);
  }, [pos, addAudit, addNotification]);

  const handleThreeWayMatch = useCallback(() => {
    if (invoices.length === 0 || pos.length === 0 || deliveries.length === 0) return;
    const inv = invoices[0];
    const po = pos[0];
    const del = deliveries[0];
    const poAmt = po.totalAmount;
    const invAmt = inv.amount;
    const variance = Math.abs(poAmt - invAmt) / poAmt * 100;
    const qtyMatch = (del.receivedQty || del.orderedQty) === del.orderedQty;
    const matched = variance < 2 && qtyMatch;

    setInvoices(prev => prev.map((i, idx) => idx === 0 ? { ...i, status: matched ? 'matched' as const : 'discrepancy' as const } : i));
    setMatchResult(matched
      ? `3-Way Match PASSED — PO: ${formatCurrency(poAmt)}, Invoice: ${formatCurrency(invAmt)} (${variance.toFixed(1)}% variance), GRN: ${del.receivedQty || del.orderedQty}/${del.orderedQty} units`
      : `3-Way Match DISCREPANCY — PO: ${formatCurrency(poAmt)} vs Invoice: ${formatCurrency(invAmt)} (${variance.toFixed(1)}% variance) | GRN: ${del.receivedQty || del.orderedQty}/${del.orderedQty} units — requires review`
    );
    addAudit('Payment & Reconciliation', '3-Way Match', 'System', matched ? 'Match passed — ready for payment' : `Discrepancy detected — ${variance.toFixed(1)}% price variance`, matched ? 'success' : 'warning');
    addNotification(matched ? '3-way match passed' : '3-way match discrepancy — review required');
  }, [invoices, pos, deliveries, addAudit, addNotification]);

  const handleExecutePayment = useCallback(() => {
    if (invoices.length === 0) return;
    const inv = invoices[0];
    setInvoices(prev => prev.map((i, idx) => idx === 0 ? { ...i, status: 'paid' as const } : i));
    if (pos.length > 0) {
      setPos(prev => prev.map((p, idx) => idx === 0 ? { ...p, status: 'completed' as const } : p));
    }
    addAudit('Payment & Reconciliation', 'Payment Executed', 'Finance Controller', `${inv.id}: ${formatCurrency(inv.amount)} paid via banking API — terms: ${paymentTermChoice.replace('_', ' ')}`, 'success');
    addNotification(`Payment of ${formatCurrency(inv.amount)} executed`);
    setKpis(prev => ({ ...prev, costSavings: prev.costSavings + Math.round(inv.amount * 0.03) }));
    setActiveStage('complete');

    // Generate supplier scores
    const supplier = SUPPLIERS.find(s => s.name === inv.supplierName);
    if (supplier) {
      setSupplierScores(generateSupplierScores(supplier));
    }
  }, [invoices, pos, paymentTermChoice, addAudit, addNotification]);

  // ── Demo Runner ──
  const runDemo = useCallback(async () => {
    if (demoRunning) return;
    demoRef.current = true;
    setDemoRunning(true);
    addAudit('System', 'Demo Started', 'System', 'Full workflow demo initiated', 'info');

    const wait = (ms: number) => new Promise(r => setTimeout(r, ms));

    // Step 1: Forecast
    setActiveTab('workflow');
    setActiveStage('forecast');
    await wait(800);
    handleForecast();
    await wait(1200);

    if (!demoRef.current) return;

    // Step 2: Create PR
    handleCreatePR();
    await wait(1000);

    // Step 3: Request pricing
    handleRequestPricing();
    await wait(2500);

    if (!demoRef.current) return;

    // Step 4: Human sign-off
    handleHumanSignoff();
    await wait(1000);

    // Step 5: Route & Approve
    handleRouteApproval();
    await wait(800);
    handleApprove();
    await wait(1000);

    if (!demoRef.current) return;

    // Step 6: Send PO
    handleSendPO();
    await wait(1000);

    // Step 7: Forwarder quotes
    handleRequestForwarderQuotes();
    await wait(1000);
    setSelectedForwarder(FORWARDER_QUOTES[2].id);
    await wait(500);
    handleSelectForwarder();
    await wait(1000);

    if (!demoRef.current) return;

    // Step 8: Delivery tracking
    handleSyncDelivery();
    await wait(800);
    handleSyncDelivery();
    await wait(800);
    handleGenerateGRN();
    await wait(1000);

    // Step 9: Payment
    handleImportInvoice();
    await wait(800);
    handleThreeWayMatch();
    await wait(800);
    handleExecutePayment();

    addAudit('System', 'Demo Complete', 'System', 'Full procurement workflow completed successfully', 'success');
    setDemoRunning(false);
    demoRef.current = false;
  }, [demoRunning, handleForecast, handleCreatePR, handleRequestPricing, handleHumanSignoff, handleRouteApproval, handleApprove, handleSendPO, handleRequestForwarderQuotes, handleSelectForwarder, handleSyncDelivery, handleGenerateGRN, handleImportInvoice, handleThreeWayMatch, handleExecutePayment, addAudit]);

  const stopDemo = useCallback(() => {
    demoRef.current = false;
    setDemoRunning(false);
  }, []);

  // ── Render Helpers ──
  const stageIndex = STAGE_ORDER.indexOf(activeStage);

  const renderSeverityIcon = (severity: AuditEntry['severity']) => {
    switch (severity) {
      case 'success': return <CheckCircle2 size={14} className="icon-success" />;
      case 'warning': return <AlertTriangle size={14} className="icon-warning" />;
      case 'error': return <X size={14} className="icon-error" />;
      default: return <Clock size={14} className="icon-info" />;
    }
  };

  return (
    <div className="app-shell">
      {/* ── Top Bar ── */}
      <header className="topbar">
        <div className="topbar-left">
          <div className="logo">
            <Layers size={22} />
            <span className="logo-text">OrderPilot</span>
          </div>
          <span className="tagline">AI Procurement Agent for SMEs</span>
        </div>
        <div className="topbar-right">
          <div className="topbar-kpis">
            <span className="kpi-chip"><Zap size={13} /> {kpis.automationRate}% Auto</span>
            <span className="kpi-chip"><Target size={13} /> {kpis.forecastAccuracy}% Forecast</span>
            <span className="kpi-chip"><DollarSign size={13} /> {formatCurrency(kpis.costSavings)} Saved</span>
          </div>
          <button className="icon-btn" onClick={() => setShowNotifications(!showNotifications)} title="Notifications">
            <Bell size={18} />
            {notifications.length > 0 && <span className="badge">{notifications.length}</span>}
          </button>
          <div className="avatar"><User size={16} /></div>
        </div>
        {showNotifications && (
          <div className="notification-panel">
            <div className="notif-header">
              <strong>Notifications</strong>
              <button onClick={() => { setNotifications([]); setShowNotifications(false); }} className="text-btn">Clear all</button>
            </div>
            {notifications.length === 0 ? <p className="notif-empty">No notifications</p> : notifications.map((n, i) => (
              <div key={i} className="notif-item">{n}</div>
            ))}
          </div>
        )}
      </header>

      {/* ── Nav Tabs ── */}
      <nav className="tab-nav">
        <button className={`tab ${activeTab === 'workflow' ? 'active' : ''}`} onClick={() => setActiveTab('workflow')}>
          <Activity size={15} /> Workflow
        </button>
        <button className={`tab ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
          <BarChart3 size={15} /> Dashboard
        </button>
        <button className={`tab ${activeTab === 'audit' ? 'active' : ''}`} onClick={() => setActiveTab('audit')}>
          <Shield size={15} /> Audit Trail
        </button>
      </nav>

      <main className="main-content">
        {/* ══════════════ WORKFLOW TAB ══════════════ */}
        {activeTab === 'workflow' && (
          <>
            {/* ── Stage Progress Bar ── */}
            <div className="stage-progress">
              {STAGE_ORDER.filter(s => s !== 'complete').map((stage, i) => (
                <button
                  key={stage}
                  className={`stage-step ${i < stageIndex ? 'done' : ''} ${stage === activeStage ? 'active' : ''} ${i > stageIndex ? 'future' : ''}`}
                  onClick={() => setActiveStage(stage)}
                >
                  <span className="stage-num">{i + 1}</span>
                  <span className="stage-label">{STAGE_LABELS[stage]}</span>
                </button>
              ))}
            </div>

            {/* ── Demo Controls ── */}
            <section className="card demo-card">
              <div className="demo-inner">
                <div>
                  <h3>POC Demo Runner</h3>
                  <p>Run a guided mock workflow end-to-end using built-in sample data. Each step generates audit entries and simulated email communications.</p>
                </div>
                <div className="demo-actions">
                  {!demoRunning ? (
                    <button className="btn primary" onClick={runDemo}><Play size={15} /> Run Full Demo</button>
                  ) : (
                    <button className="btn danger" onClick={stopDemo}><X size={15} /> Stop Demo</button>
                  )}
                </div>
              </div>
              {demoRunning && <div className="demo-progress"><div className="demo-bar" /></div>}
            </section>

            {/* ── Workflow Panels ── */}
            <div className="workflow-grid">

              {/* 1. Forecasting */}
              <section className={`card panel ${activeStage === 'forecast' ? 'panel-active' : ''}`}>
                <div className="panel-header">
                  <div className="panel-icon forecast-icon"><TrendingUp size={18} /></div>
                  <div>
                    <h3>1. Forecasting Engine</h3>
                    <p>ML-driven demand prediction with reorder recommendations</p>
                  </div>
                </div>
                <div className="panel-body">
                  <div className="form-row">
                    <label>
                      <span>SKU</span>
                      <select value={selectedSku} onChange={e => setSelectedSku(e.target.value)}>
                        {SKUS.map(s => <option key={s.id} value={s.id}>{s.name} ({s.id})</option>)}
                      </select>
                    </label>
                    <label>
                      <span>Month</span>
                      <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}>
                        <option>March 2026</option><option>April 2026</option><option>May 2026</option>
                      </select>
                    </label>
                    <label>
                      <span>Budget (USD)</span>
                      <input type="number" min={1000} value={budget} onChange={e => setBudget(+e.target.value)} />
                    </label>
                  </div>
                  <button className="btn primary" onClick={handleForecast}><Search size={14} /> Generate Forecast</button>

                  {forecastResult && (
                    <div className="result-card">
                      <div className="result-grid">
                        <div className="result-item">
                          <span className="result-label">Predicted Demand</span>
                          <span className="result-value">{forecastResult.predictedDemand} units</span>
                        </div>
                        <div className="result-item">
                          <span className="result-label">Reorder Qty</span>
                          <span className="result-value">{forecastResult.reorderQty} units</span>
                        </div>
                        <div className="result-item">
                          <span className="result-label">Est. Cost</span>
                          <span className="result-value">{formatCurrency(forecastResult.estimatedCost)}</span>
                        </div>
                        <div className="result-item">
                          <span className="result-label">Confidence</span>
                          <span className="result-value">{forecastResult.confidence}%</span>
                        </div>
                      </div>
                      <p className="rationale">{forecastResult.rationale}</p>
                    </div>
                  )}
                </div>
              </section>

              {/* 2. Draft PR */}
              <section className={`card panel ${activeStage === 'pr_generation' ? 'panel-active' : ''}`}>
                <div className="panel-header">
                  <div className="panel-icon pr-icon"><FileText size={18} /></div>
                  <div>
                    <h3>2. Draft PR Generator</h3>
                    <p>Auto-create PR from forecast with supplier pricing workflow</p>
                  </div>
                </div>
                <div className="panel-body">
                  {prs.length > 0 && (
                    <div className="pr-summary">
                      {prs.slice(0, 3).map(pr => (
                        <div key={pr.id} className="pr-card">
                          <div className="pr-top">
                            <strong>{pr.id}</strong>
                            <span className={`status-badge status-${pr.status}`}>{pr.status.replace(/_/g, ' ')}</span>
                          </div>
                          <p>{pr.skuName} — {pr.quantity} units @ {formatCurrency(pr.unitPrice)}</p>
                          <p className="pr-supplier">{pr.supplierName} — Total: {formatCurrency(pr.totalAmount)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="btn-group">
                    <button className="btn primary" onClick={handleCreatePR} disabled={!forecastResult}><FileText size={14} /> Create Draft PR</button>
                    <button className="btn secondary" onClick={handleRequestPricing} disabled={prs.length === 0}><Send size={14} /> Request Pricing</button>
                    <button className="btn warning" onClick={handleHumanSignoff} disabled={prs.length === 0}><User size={14} /> Human Sign-off</button>
                  </div>
                </div>
              </section>

              {/* 3. Approval */}
              <section className={`card panel ${activeStage === 'approval' ? 'panel-active' : ''}`}>
                <div className="panel-header">
                  <div className="panel-icon approval-icon"><CheckCircle2 size={18} /></div>
                  <div>
                    <h3>3. Approval Workflow</h3>
                    <p>Threshold-based routing with role permissions</p>
                  </div>
                </div>
                <div className="panel-body">
                  <div className="form-row">
                    <label>
                      <span>User Role</span>
                      <select value={userRole} onChange={e => setUserRole(e.target.value as any)}>
                        <option value="manager">Purchase Manager (max 5%)</option>
                        <option value="director">Company Director (max 20%)</option>
                      </select>
                    </label>
                    <label>
                      <span>Variance Threshold (%)</span>
                      <input type="number" min={0} max={20} step={0.5} value={threshold} onChange={e => setThreshold(+e.target.value)} />
                    </label>
                  </div>
                  {approvalQueue.length > 0 && (
                    <div className="approval-queue">
                      <span className="queue-label">Pending Approvals ({approvalQueue.length})</span>
                      <select value={selectedApproval} onChange={e => setSelectedApproval(e.target.value)} size={Math.min(approvalQueue.length, 4)}>
                        {approvalQueue.map(id => <option key={id} value={id}>{id} — {prs.find(p => p.id === id)?.skuName || 'Unknown'}</option>)}
                      </select>
                    </div>
                  )}
                  <div className="btn-group">
                    <button className="btn primary" onClick={handleRouteApproval} disabled={approvalQueue.length === 0}><ArrowRight size={14} /> Route for Approval</button>
                    <button className="btn secondary" onClick={handleApprove} disabled={approvalQueue.length === 0}><CheckCircle2 size={14} /> Approve</button>
                  </div>
                </div>
              </section>

              {/* 4. Supplier Communication */}
              <section className={`card panel ${activeStage === 'supplier_comms' ? 'panel-active' : ''}`}>
                <div className="panel-header">
                  <div className="panel-icon comms-icon"><Mail size={18} /></div>
                  <div>
                    <h3>4. Supplier Communication Agent</h3>
                    <p>AI-composed emails with disclosure and human handoff</p>
                  </div>
                </div>
                <div className="panel-body">
                  <div className="mailbox">
                    {emails.length === 0 ? (
                      <p className="empty-state">No emails yet. Generate a PO to start communication.</p>
                    ) : emails.slice(0, 5).map(em => (
                      <div key={em.id} className={`mail-entry ${em.requiresHuman ? 'mail-escalated' : ''}`}>
                        <div className="mail-header">
                          <strong>{em.subject}</strong>
                          {em.requiresHuman && <span className="escalation-badge">Human Required</span>}
                        </div>
                        <div className="mail-meta">
                          <span>{em.from} → {em.to}</span>
                          <span>{formatDate(em.timestamp)}</span>
                        </div>
                        {em.aiDisclosure && <span className="ai-tag">AI-Generated</span>}
                        {em.intent && <span className="intent-tag">Intent: {em.intent}</span>}
                      </div>
                    ))}
                  </div>
                  <div className="btn-group">
                    <button className="btn primary" onClick={handleSendPO} disabled={pos.length === 0 || pos[0].status !== 'generated'}><Send size={14} /> Send PO Email</button>
                    <button className="btn warning" onClick={handleSupplierEscalation} disabled={pos.length === 0}><User size={14} /> Supplier Requests Human</button>
                  </div>
                </div>
              </section>

              {/* 5. Logistics */}
              <section className={`card panel ${activeStage === 'logistics' ? 'panel-active' : ''}`}>
                <div className="panel-header">
                  <div className="panel-icon logistics-icon"><Ship size={18} /></div>
                  <div>
                    <h3>5. Logistics & Forwarders</h3>
                    <p>Select forwarders, compare quotes, approve before payment</p>
                  </div>
                </div>
                <div className="panel-body">
                  {forwarderQuotes.length > 0 && (
                    <div className="quotes-grid">
                      {forwarderQuotes.map(q => (
                        <div key={q.id} className={`quote-card ${q.status === 'selected' ? 'quote-selected' : ''} ${q.status === 'rejected' ? 'quote-rejected' : ''}`}>
                          <div className="quote-top">
                            <strong>{q.forwarderName}</strong>
                            <span className={`mode-badge mode-${q.mode}`}>{q.mode === 'air' ? '✈ Air' : '🚢 Sea'}</span>
                          </div>
                          <div className="quote-details">
                            <span>{formatCurrency(q.cost)}</span>
                            <span>{q.transitDays} days</span>
                          </div>
                          {q.status !== 'pending' && <span className={`status-badge status-${q.status}`}>{q.status}</span>}
                          {q.status === 'pending' && (
                            <button className="btn-sm" onClick={() => { setSelectedForwarder(q.id); handleSelectForwarder(); }}>Select</button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="btn-group">
                    <button className="btn primary" onClick={handleRequestForwarderQuotes} disabled={pos.length === 0}><Globe size={14} /> Request Forwarder Quotes</button>
                  </div>
                </div>
              </section>

              {/* 6. Delivery */}
              <section className={`card panel ${activeStage === 'delivery' ? 'panel-active' : ''}`}>
                <div className="panel-header">
                  <div className="panel-icon delivery-icon"><Truck size={18} /></div>
                  <div>
                    <h3>6. Delivery & GRN Tracking</h3>
                    <p>Periodic sync, discrepancy flags, and goods receipt</p>
                  </div>
                </div>
                <div className="panel-body">
                  {deliveries.length > 0 && (
                    <div className="delivery-summary">
                      {deliveries.slice(0, 2).map((d, i) => (
                        <div key={i} className="delivery-card">
                          <div className="delivery-row">
                            <span>PO: {d.poId}</span>
                            <span className={`status-badge status-${d.status}`}>{d.status}</span>
                          </div>
                          {d.carrier && <p>Carrier: {d.carrier}</p>}
                          {d.trackingNo && <p>Tracking: {d.trackingNo}</p>}
                          {d.eta && <p>ETA: {d.eta}</p>}
                          <p>Qty: {d.receivedQty !== undefined ? `${d.receivedQty}/` : ''}{d.orderedQty} units</p>
                          {d.grnGenerated && <span className="grn-badge">GRN Generated</span>}
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="btn-group">
                    <button className="btn primary" onClick={handleSyncDelivery} disabled={deliveries.length === 0}><RefreshCw size={14} /> Sync Status</button>
                    <button className="btn secondary" onClick={handlePartialDelivery} disabled={deliveries.length === 0}><Package size={14} /> Record Partial</button>
                    <button className="btn secondary" onClick={handleGenerateGRN} disabled={deliveries.length === 0}><Download size={14} /> Generate GRN</button>
                  </div>
                </div>
              </section>

              {/* 7. Payment */}
              <section className={`card panel ${activeStage === 'payment' ? 'panel-active' : ''}`}>
                <div className="panel-header">
                  <div className="panel-icon payment-icon"><CreditCard size={18} /></div>
                  <div>
                    <h3>7. Payments & 3-Way Match</h3>
                    <p>PO-GRN-Invoice matching and payment execution</p>
                  </div>
                </div>
                <div className="panel-body">
                  <div className="form-row">
                    <label>
                      <span>Payment Terms</span>
                      <select value={paymentTermChoice} onChange={e => setPaymentTermChoice(e.target.value as any)}>
                        <option value="full_sight">Full Payment at Sight</option>
                        <option value="full_pre">Full Pre-Delivery</option>
                        <option value="partial">Partial (50/50)</option>
                      </select>
                    </label>
                  </div>
                  {invoices.length > 0 && (
                    <div className="invoice-summary">
                      {invoices.slice(0, 2).map(inv => (
                        <div key={inv.id} className="invoice-card">
                          <div className="invoice-row">
                            <strong>{inv.id}</strong>
                            <span className={`status-badge status-${inv.status}`}>{inv.status}</span>
                          </div>
                          <p>{inv.supplierName} — {formatCurrency(inv.amount)} — Due: {inv.dueDate}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {matchResult && (
                    <div className={`match-result ${matchResult.includes('PASSED') ? 'match-pass' : 'match-fail'}`}>
                      <p>{matchResult}</p>
                    </div>
                  )}
                  <div className="btn-group">
                    <button className="btn primary" onClick={handleImportInvoice} disabled={pos.length === 0}><FileText size={14} /> Import Invoice</button>
                    <button className="btn secondary" onClick={handleThreeWayMatch} disabled={invoices.length === 0}><Eye size={14} /> 3-Way Match</button>
                    <button className="btn warning" onClick={handleExecutePayment} disabled={invoices.length === 0 || invoices[0].status === 'paid'}><CreditCard size={14} /> Execute Payment</button>
                  </div>
                </div>
              </section>

              {/* Complete State */}
              {activeStage === 'complete' && (
                <section className="card panel panel-complete">
                  <div className="panel-header">
                    <div className="panel-icon complete-icon"><Award size={18} /></div>
                    <div>
                      <h3>Workflow Complete</h3>
                      <p>Full procurement cycle completed successfully</p>
                    </div>
                  </div>
                  <div className="panel-body">
                    <div className="complete-stats">
                      <div className="complete-stat">
                        <CheckCircle2 size={20} className="icon-success" />
                        <span>POs Generated: {pos.length}</span>
                      </div>
                      <div className="complete-stat">
                        <Mail size={20} className="icon-info" />
                        <span>Emails Sent: {emails.length}</span>
                      </div>
                      <div className="complete-stat">
                        <DollarSign size={20} className="icon-success" />
                        <span>Payments: {invoices.filter(i => i.status === 'paid').length}</span>
                      </div>
                      <div className="complete-stat">
                        <Shield size={20} className="icon-info" />
                        <span>Audit Entries: {auditLog.length}</span>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* Supplier Scoring (wide) */}
              {supplierScores.length > 0 && (
                <section className="card panel panel-wide">
                  <div className="panel-header">
                    <div className="panel-icon score-icon"><Star size={18} /></div>
                    <div>
                      <h3>Supplier Performance Scoring</h3>
                      <p>Weighted scoring across delivery, pricing, accuracy, response time, quality</p>
                    </div>
                  </div>
                  <div className="panel-body">
                    <table className="score-table">
                      <thead>
                        <tr><th>Metric</th><th>Weight</th><th>Score</th><th>Weighted</th></tr>
                      </thead>
                      <tbody>
                        {supplierScores.map((s, i) => (
                          <tr key={i}>
                            <td>{s.metric}</td>
                            <td>{(s.weight * 100).toFixed(0)}%</td>
                            <td>
                              <div className="score-bar-wrap">
                                <div className="score-bar" style={{ width: `${s.score}%`, background: s.score >= 80 ? 'var(--green)' : s.score >= 60 ? 'var(--amber)' : 'var(--red)' }} />
                                <span>{s.score.toFixed(1)}</span>
                              </div>
                            </td>
                            <td>{(s.weight * s.score).toFixed(1)}</td>
                          </tr>
                        ))}
                        <tr className="score-total">
                          <td colSpan={3}><strong>Total Score</strong></td>
                          <td><strong>{supplierScores.reduce((sum, s) => sum + s.weight * s.score, 0).toFixed(1)} / 100</strong></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
            </div>
          </>
        )}

        {/* ══════════════ DASHBOARD TAB ══════════════ */}
        {activeTab === 'dashboard' && (
          <div className="dashboard">
            <h2>Real-Time KPI Dashboard</h2>
            <div className="kpi-grid">
              {KPI_DEFINITIONS.map(kd => {
                const val = (kpis as any)[kd.key];
                let display = String(val);
                if (kd.format === 'percent') display = formatPercent(val);
                else if (kd.format === 'currency') display = formatCurrency(val);
                else if (kd.format === 'days') display = val + ' days';

                return (
                  <div key={kd.key} className="card kpi-card">
                    <span className="kpi-label">{kd.label}</span>
                    <span className="kpi-value">{display}</span>
                    <div className="kpi-bar-wrap">
                      <div className="kpi-bar" style={{ width: `${kd.format === 'percent' ? val : Math.min(val / 200 * 100, 100)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>

            <h2>Procurement Pipeline</h2>
            <div className="pipeline">
              {prs.length === 0 && pos.length === 0 ? (
                <p className="empty-state">No active procurement items. Run a demo or create a forecast to begin.</p>
              ) : (
                <>
                  {prs.map(pr => (
                    <div key={pr.id} className="card pipeline-card">
                      <div className="pipeline-top">
                        <strong>{pr.id}</strong>
                        <span className={`status-badge status-${pr.status}`}>{pr.status.replace(/_/g, ' ')}</span>
                      </div>
                      <p>{pr.skuName} — {pr.quantity} units — {formatCurrency(pr.totalAmount)}</p>
                      <p className="pipeline-supplier">{pr.supplierName}</p>
                    </div>
                  ))}
                  {pos.map(po => (
                    <div key={po.id} className="card pipeline-card">
                      <div className="pipeline-top">
                        <strong>{po.id}</strong>
                        <span className={`status-badge status-${po.status}`}>{po.status}</span>
                      </div>
                      <p>{po.items.map(i => i.skuName).join(', ')} — {formatCurrency(po.totalAmount)}</p>
                      <p className="pipeline-supplier">{po.supplierName}</p>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        )}

        {/* ══════════════ AUDIT TAB ══════════════ */}
        {activeTab === 'audit' && (
          <div className="audit-view">
            <h2>Immutable Audit Trail</h2>
            <p className="audit-subtitle">{auditLog.length} events logged — all actions, emails, approvals, and payments are recorded</p>
            {auditLog.length === 0 ? (
              <p className="empty-state">No audit entries yet. Run the demo or perform actions to generate audit events.</p>
            ) : (
              <div className="audit-list">
                {auditLog.map(entry => (
                  <div key={entry.id} className={`card audit-entry audit-${entry.severity}`}>
                    <div className="audit-left">
                      {renderSeverityIcon(entry.severity)}
                      <div className="audit-content">
                        <div className="audit-top">
                          <strong>{entry.action}</strong>
                          <span className="audit-module">{entry.module}</span>
                        </div>
                        <p>{entry.details}</p>
                        <span className="audit-meta">{entry.id} — {entry.actor} — {formatDate(entry.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;