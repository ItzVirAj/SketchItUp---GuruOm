import Groq from 'groq-sdk';
import { ordersService } from '../orders/orders.service';
import { inventoryService } from '../inventory/inventory.service';
import { productionService } from '../production/production.service';
import { qcService } from '../qc/qc.service';
import { dispatchService } from '../dispatch/dispatch.service';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Llama 3.3 70B was retired on Groq — this is their current recommended
// replacement for tool-calling workloads.
const MODEL = 'openai/gpt-oss-120b';

function buildSystemPrompt(): string {
  const today = new Date().toISOString().split('T')[0];
  return `You are the Owner Copilot for GuruOm Industries, a precision machining job shop. You help the owner answer questions about orders, raw materials, production, quality checks (QC/PDI), and dispatch by calling the tools available to you.

Today's real date is ${today}. You have no other way of knowing the current date — never guess or assume it. Use this exact date for any question involving "overdue", "delayed", "this week", or any other time comparison.

An order is overdue/delayed if its delivery date is before today's date AND it has not been fully dispatched yet.

Important: every tool returns the COMPLETE, unfiltered list of records — there is no server-side filtering. You must search, filter, and reason over the results yourself to answer the specific question asked.

create_order changes real data. Before calling it, always summarize the order (customer, item, quantity, dates) back to the owner in plain language and get clear agreement first — never call it on a vague or ambiguous request. (A second, separate safeguard also exists outside your control, but never rely on that — always confirm yourself first.)

If the owner asks to see, visualize, or chart something, call create_chart using real numbers from your other tool calls — never invented data.

When asked for business analysis or suggestions: freely point out patterns, trends, and comparisons you can actually see in the real data you retrieved — this is safe and valuable. When asked for advice on strategy, pricing, or long-term profitability, frame it as things worth considering based on what the data shows, not as confident directives. You don't have context the owner has — customer relationships, cash flow, competitive pressure, risk tolerance. Say so plainly rather than sounding more certain than you are.

Always answer in plain, concise business language — never dump raw JSON back at the owner. If the tools don't give you enough to answer confidently, say so honestly instead of guessing.`;
}

// ── Tool schemas — same 14 tools as the Python version, ported ──
const TOOL_DEFINITIONS = [
  { type: 'function', function: { name: 'list_orders', description: "Get every customer order in the system (no filtering — returns the full list). Use for questions about orders in general, e.g. 'what orders do we have from Bajaj Auto', 'show me delayed orders', 'top 3 orders by value'. You will need to search/filter/sort the returned list yourself, the backend does not do this.", parameters: { type: 'object', properties: {}, required: [] } } },
  { type: 'function', function: { name: 'get_order_by_id', description: "Get full detail for one specific order by its ID.", parameters: { type: 'object', properties: { order_id: { type: 'string' } }, required: ['order_id'] } } },
  { type: 'function', function: { name: 'list_stock', description: "Get current stock levels for every raw material / item (full list, no filtering). Use for 'do we have enough X', 'what's our stock of Y'.", parameters: { type: 'object', properties: {}, required: [] } } },
  { type: 'function', function: { name: 'list_shortages', description: "Get materials currently short of what's needed to fulfil open orders. Use for 'what materials are we short on', 'what should we reorder'.", parameters: { type: 'object', properties: {}, required: [] } } },
  { type: 'function', function: { name: 'list_job_cards', description: "Get every production job card (full list). Use for 'what's in production right now', 'what stage is order X at'.", parameters: { type: 'object', properties: {}, required: [] } } },
  { type: 'function', function: { name: 'get_job_card', description: "Get full detail for one specific job card by its job number.", parameters: { type: 'object', properties: { job_no: { type: 'string' } }, required: ['job_no'] } } },
  { type: 'function', function: { name: 'get_machine_telemetry', description: "Get machine utilization/telemetry data across the shop floor. Use for 'which machine had the most downtime', 'how utilized is machine X'.", parameters: { type: 'object', properties: {}, required: [] } } },
  { type: 'function', function: { name: 'list_qc_inspections', description: "Get every in-process QC inspection (full list). Use for 'what's on QC hold', 'what failed inspection'.", parameters: { type: 'object', properties: {}, required: [] } } },
  { type: 'function', function: { name: 'list_pdi_queue', description: "Get every Pre-Dispatch Inspection record (full list).", parameters: { type: 'object', properties: {}, required: [] } } },
  { type: 'function', function: { name: 'check_dispatch_eligibility', description: "Check whether a specific order (by PO number) is cleared to dispatch.", parameters: { type: 'object', properties: { order_po: { type: 'string' } }, required: ['order_po'] } } },
  { type: 'function', function: { name: 'get_dispatchable_qty', description: "Get how much quantity of a specific order is currently eligible to dispatch.", parameters: { type: 'object', properties: { order_id: { type: 'string' } }, required: ['order_id'] } } },
  { type: 'function', function: { name: 'list_dispatches', description: "Get every delivery challan / dispatch record (full list).", parameters: { type: 'object', properties: {}, required: [] } } },
  { type: 'function', function: { name: 'create_chart', description: "Render a chart to visually show data you've already gathered. Use when the owner asks to see/show/visualize/chart/graph something. Never invent numbers.", parameters: { type: 'object', properties: { chart_type: { type: 'string', enum: ['bar', 'line', 'pie'] }, title: { type: 'string' }, data: { type: 'array', items: { type: 'object', properties: { label: { type: 'string' }, value: { type: 'number' } }, required: ['label', 'value'] } } }, required: ['chart_type', 'title', 'data'] } } },
  { type: 'function', function: { name: 'create_order', description: "Create a new customer order, with one or many line items. This is a WRITE action. If the owner describes a PO with several items, collect ALL of them first and call this ONCE with every line item included. Always summarize the full order back to the owner and get clear agreement before calling this.", parameters: { type: 'object', properties: { po_no: { type: 'string' }, customer_name: { type: 'string' }, po_date: { type: 'string' }, delivery_date: { type: 'string' }, lines: { type: 'array', items: { type: 'object', properties: { item_code: { type: 'string' }, item_description: { type: 'string' }, order_qty: { type: 'number' }, rate: { type: 'number' } }, required: ['item_code', 'item_description', 'order_qty', 'rate'] } } }, required: ['po_no', 'customer_name', 'po_date', 'delivery_date', 'lines'] } } },
];

// Maps tool name -> the real internal service call. Direct function calls,
// not HTTP — this is the whole point of living inside the backend now: no
// separate auth, no token expiry, it's already running as the logged-in user.
async function executeReadTool(name: string, args: any): Promise<any> {
  switch (name) {
    case 'list_orders': return ordersService.getOrders();
    case 'get_order_by_id': return ordersService.getOrderById(args.order_id);
    case 'list_stock': return inventoryService.getStock();
    case 'list_shortages': return inventoryService.getShortages();
    case 'list_job_cards': return productionService.getJobCards();
    case 'get_job_card': return productionService.getJobCardByJobNo(args.job_no);
    case 'get_machine_telemetry': return productionService.getProductionTelemetry();
    case 'list_qc_inspections': return qcService.getQCQueue();
    case 'list_pdi_queue': return qcService.getPDIQueue();
    case 'check_dispatch_eligibility': return qcService.checkDispatchEligibility(args.order_po);
    case 'get_dispatchable_qty': return dispatchService.getDispatchableQty(args.order_id);
    case 'list_dispatches': return dispatchService.getDispatches();
    case 'create_chart': return { chartReady: true, ...args }; // frontend renders this via Recharts
    default: throw new Error(`Unknown tool: ${name}`);
  }
}

export const copilotService = {
  async chat(incomingMessages: any[], actorContext: { role?: string; name?: string }) {
    const messages: any[] = [{ role: 'system', content: buildSystemPrompt() }, ...incomingMessages];

    for (let round = 0; round < 5; round++) {
      const response = await groq.chat.completions.create({
        model: MODEL,
        messages,
        tools: TOOL_DEFINITIONS as any,
        tool_choice: 'auto',
      });
      const message = response.choices[0].message;

      if (!message.tool_calls || message.tool_calls.length === 0) {
        return { reply: message.content, done: true };
      }

      // create_order needs a real human clicking a real Confirm button in the
      // UI — not just AI-generated text — so we stop here instead of running it.
      const orderCall = message.tool_calls.find((tc: any) => tc.function.name === 'create_order');
      if (orderCall) {
        return {
          reply: message.content || 'Here is the order — please review and confirm.',
          needsConfirmation: true,
          pendingAction: { tool: 'create_order', arguments: JSON.parse(orderCall.function.arguments) },
          done: false,
        };
      }

      messages.push(message);
      for (const toolCall of message.tool_calls) {
        const args = JSON.parse(toolCall.function.arguments || '{}');
        let result: any;
        try {
          result = await executeReadTool(toolCall.function.name, args);
        } catch (e: any) {
          result = { error: e.message };
        }
        messages.push({ role: 'tool', tool_call_id: toolCall.id, content: JSON.stringify(result) });
      }
    }
    return { reply: "Sorry, I couldn't finish that within a reasonable number of steps.", done: true };
  },

  // Called ONLY after a real button click in the UI — this is the code-level
  // safety gate, the web equivalent of the terminal's "type yes" prompt.
  async confirmCreateOrder(orderArgs: any, actorContext: { role?: string; name?: string }) {
    const body = {
      poNo: orderArgs.po_no,
      customerName: orderArgs.customer_name,
      poDate: orderArgs.po_date,
      deliveryDate: orderArgs.delivery_date,
      lines: orderArgs.lines.map((l: any) => ({
        itemCode: l.item_code,
        itemDescription: l.item_description,
        orderQty: l.order_qty,
        rate: l.rate,
      })),
    };
    return ordersService.createOrder(body, actorContext);
  },
};
