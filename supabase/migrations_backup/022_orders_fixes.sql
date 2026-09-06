-- 1. Add is_test column
ALTER TABLE public.customer_orders ADD COLUMN IF NOT EXISTS is_test BOOLEAN DEFAULT FALSE;

-- 2. Backfill is_test based on existing hardcoded strings
UPDATE public.customer_orders 
SET is_test = TRUE 
WHERE po_no LIKE 'PO-GOLDEN-%' 
   OR po_no LIKE 'PO-TEST-REG-%'
   OR po_no LIKE 'PO-PERSIST-%'
   OR po_no LIKE 'PO-TATA-%'
   OR po_no LIKE 'PO-TEST-%'
   OR po_no LIKE 'PO-PROC-%'
   OR po_no LIKE '__TEST__%'
   OR po_no LIKE '%615144%'
   OR po_no LIKE '%678480%';

-- 3. Create RPC for atomic order creation
CREATE OR REPLACE FUNCTION create_order_with_lines(
  order_payload jsonb,
  lines_payload jsonb
) RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  line record;
BEGIN
  -- Insert the order header
  INSERT INTO public.customer_orders (
    id, po_no, customer_name, po_date, delivery_date, 
    status, stage, progress_step, gross_amount, tax_category, remark, is_test
  )
  VALUES (
    order_payload->>'id',
    order_payload->>'po_no',
    order_payload->>'customer_name',
    order_payload->>'po_date',
    order_payload->>'delivery_date',
    order_payload->>'status',
    order_payload->>'stage',
    (order_payload->>'progress_step')::int,
    (order_payload->>'gross_amount')::numeric,
    order_payload->>'tax_category',
    order_payload->>'remark',
    COALESCE((order_payload->>'is_test')::boolean, false)
  );

  -- Insert the line items
  IF lines_payload IS NOT NULL AND jsonb_typeof(lines_payload) = 'array' THEN
    FOR line IN SELECT * FROM jsonb_array_elements(lines_payload)
    LOOP
      INSERT INTO public.order_line_items (
        id, order_id, item_code, item_description, cust_part_no,
        order_qty, unit, rate, dispatched_qty, pending_qty
      )
      VALUES (
        line.value->>'id',
        line.value->>'order_id',
        line.value->>'item_code',
        line.value->>'item_description',
        line.value->>'cust_part_no',
        (line.value->>'order_qty')::numeric,
        line.value->>'unit',
        (line.value->>'rate')::numeric,
        (line.value->>'dispatched_qty')::numeric,
        (line.value->>'pending_qty')::numeric
      );
    END LOOP;
  END IF;
END;
$$;
