-- ============================================================================
-- Migration: 023_remove_test_orders.sql
-- Description: Physically delete all test orders and remove the is_test column.
-- ============================================================================

-- 1. Delete all test orders from the database
-- Note: ON DELETE CASCADE will handle related lines if configured, 
-- otherwise we delete them manually just in case.
DELETE FROM public.order_line_items 
WHERE order_id IN (SELECT id FROM public.customer_orders WHERE is_test = TRUE);

DELETE FROM public.customer_orders 
WHERE is_test = TRUE;

-- 2. Drop the is_test column
ALTER TABLE public.customer_orders DROP COLUMN IF EXISTS is_test;

-- 3. Recreate the RPC without the is_test parameter
DROP FUNCTION IF EXISTS public.create_order_with_lines(jsonb, jsonb);

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
    status, stage, progress_step, gross_amount, tax_category, remark
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
    order_payload->>'remark'
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
