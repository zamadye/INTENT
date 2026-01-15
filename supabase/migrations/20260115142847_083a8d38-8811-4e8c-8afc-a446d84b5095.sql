-- Fix campaign status constraint to match implemented state machine
-- Valid states: draft → generated → finalized → shared

-- Step 1: Drop the existing constraint if it exists
ALTER TABLE public.campaigns 
  DROP CONSTRAINT IF EXISTS campaigns_status_check;

-- Step 2: Add correct constraint matching implemented state machine
ALTER TABLE public.campaigns
  ADD CONSTRAINT campaigns_status_check 
  CHECK (status IN ('draft', 'generated', 'finalized', 'shared'));

-- Step 3: Create state transition validation function
CREATE OR REPLACE FUNCTION public.validate_campaign_state_transition()
RETURNS TRIGGER AS $$
BEGIN
  -- New campaigns must start in draft state
  IF TG_OP = 'INSERT' AND NEW.status != 'draft' THEN
    RAISE EXCEPTION 'New campaigns must start in draft state';
  END IF;
  
  -- Validate state transitions on update
  IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    IF NOT (
      (OLD.status = 'draft' AND NEW.status = 'generated') OR
      (OLD.status = 'generated' AND NEW.status IN ('finalized', 'draft')) OR
      (OLD.status = 'finalized' AND NEW.status = 'shared')
    ) THEN
      RAISE EXCEPTION 'Invalid state transition: % -> %', OLD.status, NEW.status;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = public;

-- Step 4: Create trigger to enforce state machine
DROP TRIGGER IF EXISTS enforce_campaign_state_machine ON public.campaigns;
CREATE TRIGGER enforce_campaign_state_machine
  BEFORE INSERT OR UPDATE ON public.campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_campaign_state_transition();