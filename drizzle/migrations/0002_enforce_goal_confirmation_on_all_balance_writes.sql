ALTER FUNCTION public.prepare_goal_movement(uuid,text,numeric,text,text,uuid) SECURITY DEFINER;
ALTER FUNCTION public.confirm_goal_movement(uuid,boolean) SECURITY DEFINER;
REVOKE INSERT,UPDATE,DELETE ON public.goal_movement_proposals FROM authenticated;
GRANT SELECT ON public.goal_movement_proposals TO authenticated;

CREATE FUNCTION public.require_goal_confirmation() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE proposal public.goal_movement_proposals;
BEGIN
 IF auth.uid() IS NULL THEN
  IF auth.role()='service_role' OR session_user IN ('postgres','supabase_admin') THEN RETURN NEW; END IF;
  RAISE EXCEPTION 'Faça login para alterar a meta.';
 END IF;
 IF TG_OP='INSERT' THEN
  IF NEW.valor_atual<>0 THEN RAISE EXCEPTION 'Crie a meta com saldo zero e confirme o aporte inicial.'; END IF;
  RETURN NEW;
 END IF;
 IF NEW.valor_atual=OLD.valor_atual THEN RETURN NEW; END IF;
 SELECT * INTO proposal FROM public.goal_movement_proposals WHERE id=NULLIF(current_setting('orca.goal_proposal',true),'')::uuid AND user_id=auth.uid() AND goal_id=OLD.id AND status='pending' FOR UPDATE;
 IF NOT FOUND OR proposal.expected_balance<>OLD.valor_atual OR proposal.expected_balance+proposal.delta<>NEW.valor_atual OR NEW.user_id<>OLD.user_id THEN
  RAISE EXCEPTION 'Confirme a proposta antes de alterar o saldo da meta.';
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.require_goal_confirmation() FROM PUBLIC;
CREATE TRIGGER require_goal_confirmation BEFORE INSERT OR UPDATE OF valor_atual ON public.goals FOR EACH ROW EXECUTE FUNCTION public.require_goal_confirmation();

CREATE OR REPLACE FUNCTION public.confirm_goal_movement(p_proposal_id uuid,p_approved boolean) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE proposal public.goal_movement_proposals; g public.goals;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Faça login para continuar.'; END IF;
 IF p_approved IS NULL THEN RAISE EXCEPTION 'Informe sua confirmação.'; END IF;
 SELECT * INTO proposal FROM public.goal_movement_proposals WHERE id=p_proposal_id AND user_id=auth.uid() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Confirmação não encontrada.'; END IF;
 SELECT * INTO g FROM public.goals WHERE id=proposal.goal_id AND user_id=auth.uid() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Meta não encontrada.'; END IF;
 IF proposal.status<>'pending' THEN RETURN jsonb_build_object('status',proposal.status,'meta',to_jsonb(g)); END IF;
 IF NOT p_approved THEN UPDATE public.goal_movement_proposals SET status='cancelled' WHERE id=proposal.id; RETURN jsonb_build_object('status','cancelled','meta',to_jsonb(g)); END IF;
 IF proposal.created_at<clock_timestamp()-interval '24 hours' THEN RAISE EXCEPTION 'Confirmação expirada. Peça novamente ao Orça.'; END IF;
 IF g.valor_atual<>proposal.expected_balance THEN RAISE EXCEPTION 'O saldo mudou. Peça novamente ao Orça antes de confirmar.'; END IF;
 IF g.valor_atual+proposal.delta<0 THEN RAISE EXCEPTION 'A retirada ultrapassa o saldo da meta.'; END IF;
 PERFORM set_config('orca.goal_proposal',proposal.id::text,true);
 PERFORM set_config('orca.goal_action',proposal.action,true);
 PERFORM set_config('orca.goal_reference',COALESCE(proposal.reference_id::text,''),true);
 PERFORM set_config('orca.goal_reason',proposal.reason,true);
 UPDATE public.goals SET valor_atual=valor_atual+proposal.delta WHERE id=g.id RETURNING * INTO g;
 UPDATE public.goal_movement_proposals SET status='confirmed' WHERE id=proposal.id;
 RETURN jsonb_build_object('status','confirmed','meta',to_jsonb(g));
END $$;
REVOKE ALL ON FUNCTION public.confirm_goal_movement(uuid,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirm_goal_movement(uuid,boolean) TO authenticated;