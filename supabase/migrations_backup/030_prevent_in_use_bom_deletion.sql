-- ============================================================
-- 030: PREVENT DELETION OF IN-USE BILL OF MATERIALS (BOM)
-- Protects BOMs from deletion when:
-- 1. Active customer orders depend on the BOM's parent part code
-- 2. Active job cards depend on the BOM's parent part code / revision
-- ============================================================

CREATE OR REPLACE FUNCTION public.check_bom_deletion_safety()
RETURNS TRIGGER AS $$
DECLARE
    v_active_order_count INT := 0;
    v_active_job_count INT := 0;
    v_order_po TEXT;
    v_job_no TEXT;
BEGIN
    -- 1. Check active customer orders referencing this BOM's parent part code
    -- Terminal order states ('COMPLETED', 'CANCELLED', 'CLOSED') do not block deletion
    IF OLD.status = 'ACTIVE' THEN
        SELECT COUNT(DISTINCT o.id), MIN(o.po_no)
        INTO v_active_order_count, v_order_po
        FROM public.customer_orders o
        JOIN public.order_line_items li ON li.order_id = o.id
        WHERE li.item_code = OLD.parent_part_code
          AND UPPER(o.status) NOT IN ('COMPLETED', 'CANCELLED', 'CLOSED');

        IF v_active_order_count > 0 THEN
            RAISE EXCEPTION 'BOM_IN_USE: Cannot delete BOM % because % active customer order(s) (e.g. %) currently depend on it.',
                OLD.bom_code, v_active_order_count, v_order_po
                USING ERRCODE = '23503';
        END IF;
    END IF;

    -- 2. Check active job cards referencing this BOM's parent part code / revision
    -- Terminal job states ('COMPLETED', 'CANCELLED', 'CLOSED') do not block deletion
    SELECT COUNT(*), MIN(jc.job_no)
    INTO v_active_job_count, v_job_no
    FROM public.job_cards jc
    WHERE jc.part_code = OLD.parent_part_code
      AND UPPER(COALESCE(jc.job_status, 'NOT_STARTED')) NOT IN ('COMPLETED', 'CANCELLED', 'CLOSED')
      AND (OLD.status = 'ACTIVE' OR jc.drawing_revision = OLD.revision);

    IF v_active_job_count > 0 THEN
        RAISE EXCEPTION 'BOM_IN_USE: Cannot delete BOM % because % active job card(s) (e.g. %) currently depend on it.',
            OLD.bom_code, v_active_job_count, v_job_no
            USING ERRCODE = '23503';
    END IF;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger before delete on bill_of_materials
DROP TRIGGER IF EXISTS trg_prevent_in_use_bom_deletion ON public.bill_of_materials;
CREATE TRIGGER trg_prevent_in_use_bom_deletion
BEFORE DELETE ON public.bill_of_materials
FOR EACH ROW
EXECUTE FUNCTION public.check_bom_deletion_safety();
