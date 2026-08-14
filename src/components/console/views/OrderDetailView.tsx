import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Upload, 
  XCircle, 
  CheckCircle2, 
  Clock, 
  Truck, 
  FileText, 
  ChevronRight,
  ShieldCheck,
  Package,
  Layers,
  Calendar,
  DollarSign,
  Tag,
  X,
  RefreshCw
} from 'lucide-react';
import { CustomerOrder, OrderStatus } from '../../../types/console';

interface OrderDetailViewProps {
  order: CustomerOrder;
  isDarkMode: boolean;
  onBack: () => void;
  onCloseOrder?: (orderId: string) => void;
  onCancelOrder?: (orderId: string) => void;
  onNavigateToPDI?: () => void;
  onNavigateToDispatch?: () => void;
}

export const OrderDetailView: React.FC<OrderDetailViewProps> = ({
  order,
  isDarkMode,
  onBack,
  onCloseOrder,
  onCancelOrder,
  onNavigateToPDI,
  onNavigateToDispatch
}) => {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [poFileName, setPoFileName] = useState<string | null>(order.clientPoFile || null);

  const steps = [
    { name: 'Order Created', key: 0, icon: FileText },
    { name: 'In Process', key: 1, icon: RefreshCw },
    { name: 'Ready to be Shipped', key: 2, icon: ShieldCheck },
    { name: 'Shipped', key: 3, icon: Package },
    { name: 'In Transit', key: 4, icon: Truck },
    { name: 'Delivered', key: 5, icon: CheckCircle2 }
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPoFileName(e.target.files[0].name);
      setShowUploadModal(false);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* Navigation Header Bar */}
      <div className={`p-6 rounded-3xl border transition-all ${
        isDarkMode 
          ? 'bg-slate-900/80 border-slate-800/80 text-white backdrop-blur-xl shadow-2xl' 
          : 'bg-white border-slate-200 shadow-sm text-slate-900'
      }`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className={`p-2.5 rounded-2xl border cursor-pointer transition-all ${
                isDarkMode 
                  ? 'border-slate-800 bg-slate-950/60 text-slate-300 hover:bg-slate-800 hover:text-white' 
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
              title="Back to Orders"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold font-mono tracking-tight text-[#5B75F8] dark:text-[#7B92FF]">
                  {order.poNo}
                </h1>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-mono font-bold uppercase border ${
                  order.status === 'CANCELLED' ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/30' :
                  order.status === 'CONFIRMED' ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-[#5B75F8]/15 dark:text-[#7B92FF] dark:border-[#5B75F8]/30' :
                  order.status === 'IN_PRODUCTION' ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/15 dark:text-purple-400 dark:border-purple-500/30' :
                  order.status === 'PARTIALLY_DISPATCHED' ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30' :
                  order.status === 'CLOSED' ? 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700' :
                  'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${
                    order.status === 'CANCELLED' ? 'bg-rose-500' :
                    order.status === 'CONFIRMED' ? 'bg-[#5B75F8]' :
                    order.status === 'IN_PRODUCTION' ? 'bg-purple-500 animate-pulse' :
                    order.status === 'PARTIALLY_DISPATCHED' ? 'bg-amber-500' :
                    order.status === 'CLOSED' ? 'bg-slate-400' : 'bg-emerald-500'
                  }`} />
                  <span>{order.status.replace('_', ' ')}</span>
                </span>
              </div>
              <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Order Spine & Telemetry for <strong className="text-[#5B75F8] dark:text-[#7B92FF] font-semibold">{order.customerName}</strong>
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            {order.status !== 'CLOSED' && order.status !== 'CANCELLED' && (
              <>
                <button
                  onClick={() => onCloseOrder?.(order.id)}
                  className={`px-4 py-2 rounded-2xl border text-xs font-bold font-mono transition-all cursor-pointer ${
                    isDarkMode ? 'border-slate-800 bg-slate-950/60 text-slate-300 hover:bg-slate-800' : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Close Order
                </button>
                <button
                  onClick={() => onCancelOrder?.(order.id)}
                  className="px-4 py-2 rounded-2xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold text-xs font-mono transition-all cursor-pointer"
                >
                  Cancel Order
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Progress Telemetry Milestone Pipeline */}
      <div className={`p-8 rounded-3xl border transition-all shadow-xl ${
        isDarkMode ? 'bg-slate-900/80 border-slate-800/80 backdrop-blur-xl text-white' : 'bg-white border-slate-200 text-slate-900 shadow-xs'
      }`}>
        {/* Step Progress Container matching reference design */}
        <div className="flex items-start justify-between w-full py-4 overflow-x-auto scrollbar-none">
          {steps.map((st, idx) => {
            const activeStepIndex = Math.min(order.progressStep, 5);
            const isCompleted = idx < activeStepIndex;
            const isCurrent = idx === activeStepIndex;
            const StepIcon = st.icon;

            return (
              <React.Fragment key={st.name}>
                {/* Step Node */}
                <div className="flex flex-col items-center shrink-0 z-10 min-w-[90px] sm:min-w-0">
                  {/* Node Circle */}
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer ${
                    isCurrent
                      ? 'bg-blue-600 text-white ring-4 ring-blue-500/20 shadow-lg shadow-blue-500/40 scale-110 border-2 border-blue-500'
                      : isCompleted
                        ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border-2 border-blue-400 dark:border-blue-500 shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800/80 text-slate-400 dark:text-slate-500 border-2 border-slate-300 dark:border-slate-700'
                  }`}>
                    <StepIcon className="w-5 h-5 stroke-[2.2]" />
                  </div>

                  {/* Step Label */}
                  <span className={`mt-3 text-xs sm:text-sm font-bold italic tracking-tight text-center max-w-[110px] ${
                    isCurrent || isCompleted
                      ? (isDarkMode ? 'text-white' : 'text-slate-900')
                      : 'text-slate-400 dark:text-slate-500'
                  }`}>
                    {st.name}
                  </span>
                </div>

                {/* Connecting Line strictly between this step circle and the next step circle */}
                {idx < steps.length - 1 && (
                  <div 
                    className={`flex-1 self-start mt-6 h-[3px] mx-1.5 transition-all duration-500 rounded-full min-w-[20px] ${
                      idx < activeStepIndex 
                        ? 'bg-blue-500' 
                        : isDarkMode ? 'bg-slate-800' : 'bg-slate-200'
                    }`} 
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Customer Information Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono text-xs">
        <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-slate-900/60 border-slate-800/80' : 'bg-white border-slate-200'}`}>
          <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">CUSTOMER</span>
          <span className={`font-bold block truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{order.customerName}</span>
        </div>
        <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-slate-900/60 border-slate-800/80' : 'bg-white border-slate-200'}`}>
          <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">PO DATE</span>
          <span className={`font-bold block ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{order.poDate}</span>
        </div>
        <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-slate-900/60 border-slate-800/80' : 'bg-white border-slate-200'}`}>
          <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">DELIVERY</span>
          <span className="font-bold text-amber-500 block">{order.deliveryDate}</span>
        </div>
        <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-slate-900/60 border-slate-800/80' : 'bg-white border-slate-200'}`}>
          <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">TAX CATEGORY</span>
          <span className={`font-bold block ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{order.taxCategory || 'GST 18%'}</span>
        </div>
        <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-slate-900/60 border-slate-800/80' : 'bg-white border-slate-200'}`}>
          <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">REMARK</span>
          <span className={`font-bold block truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{order.remark || '—'}</span>
        </div>
        <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-slate-900/60 border-slate-800/80' : 'bg-white border-slate-200'}`}>
          <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">GROSS AMOUNT</span>
          <span className="font-bold text-emerald-500 block">
            ₹{order.grossAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Client PO File Section */}
      <div className={`p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-3 font-mono text-xs ${
        isDarkMode ? 'bg-slate-900/60 border-slate-800/80 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-[#5B75F8]/20 text-[#7B92FF]">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold block">CLIENT PO DOCUMENT</span>
            <span className="text-slate-400 text-[11px]">{poFileName ? poFileName : 'No document attached'}</span>
          </div>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="px-3.5 py-1.5 rounded-xl border border-[#5B75F8]/30 bg-[#5B75F8]/10 text-[#5B75F8] dark:text-[#7B92FF] font-bold hover:bg-[#5B75F8]/20 cursor-pointer text-xs flex items-center gap-1.5 transition-all"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Upload PO File</span>
        </button>
      </div>

      {/* LINE ITEMS TABLE */}
      <div className={`p-6 rounded-3xl border space-y-4 font-mono text-xs transition-all shadow-lg ${
        isDarkMode ? 'bg-slate-900/80 border-slate-800/80 backdrop-blur-xl text-white' : 'bg-white border-slate-200 text-slate-900 shadow-xs'
      }`}>
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <h3 className="font-bold uppercase tracking-wider text-[#5B75F8] dark:text-[#7B92FF] text-sm flex items-center gap-2">
            <Package className="w-4 h-4" />
            <span>Order Line Items ({order.lines?.length || 0})</span>
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className={`border-b text-[10px] font-bold uppercase tracking-wider ${
                isDarkMode ? 'text-slate-400 border-slate-800' : 'text-slate-500 border-slate-200'
              }`}>
                <th className="py-3 px-4">#</th>
                <th className="py-3 px-4">Item Code & Description</th>
                <th className="py-3 px-4">Customer Part #</th>
                <th className="py-3 px-4 text-right">Order Qty</th>
                <th className="py-3 px-4 text-right">Dispatched</th>
                <th className="py-3 px-4 text-right">Pending</th>
                <th className="py-3 px-4 text-right">Rate ₹</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
              {order.lines.map((ln, idx) => (
                <tr key={ln.id} className={isDarkMode ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                  <td className="py-3.5 px-4 font-bold text-slate-400">{idx + 1}</td>
                  <td className="py-3.5 px-4 font-bold">
                    <div className="text-[#5B75F8] dark:text-[#7B92FF]">{ln.itemCode}</div>
                    <div className="text-slate-400 text-[11px] font-normal">{ln.itemDescription}</div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-400">{ln.custPartNo || '—'}</td>
                  <td className="py-3.5 px-4 text-right font-bold">{ln.orderQty} {ln.unit}</td>
                  <td className="py-3.5 px-4 text-right text-emerald-500 font-bold">{ln.dispatchedQty}</td>
                  <td className="py-3.5 px-4 text-right text-amber-500 font-bold">{ln.pendingQty}</td>
                  <td className="py-3.5 px-4 text-right font-bold">₹{ln.rate.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md font-sans">
          <div className={`relative w-full max-w-md rounded-3xl border p-6 space-y-4 font-mono text-xs z-10 shadow-2xl ${
            isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm uppercase text-[#5B75F8] dark:text-[#7B92FF]">Upload Client PO Document</h3>
              <button onClick={() => setShowUploadModal(false)} className="text-slate-400 hover:text-white font-bold cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-3">Upload PDF or image file of the customer purchase order</p>
              <input 
                type="file" 
                onChange={handleFileUpload}
                className="w-full p-3 border border-slate-800 rounded-xl text-xs bg-slate-900 cursor-pointer" 
              />
            </div>
            <div className="pt-2 flex justify-end">
              <button onClick={() => setShowUploadModal(false)} className="px-4 py-2 rounded-xl border border-slate-800 cursor-pointer">Close</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default OrderDetailView;
