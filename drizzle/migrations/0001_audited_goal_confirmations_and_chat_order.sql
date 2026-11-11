ALTER TABLE public.chat_messages ADD COLUMN reply_to_sdk_id text;
UPDATE public.chat_messages AS m SET sdk_id = m.id::text, reply_to_sdk_id = (SELECT u.sdk_id FROM public.chat_messages u WHERE u.user_id=m.user_id AND u.role='user' ORDER BY u.created_at DESC LIMIT 1), created_at = COALESCE((SELECT MAX(u.created_at) + interval '1 millisecond' FROM public.chat_messages u WHERE u.user_id=m.user_id AND u.role='user'), m.created_at) WHERE m.role='assistant' AND m.sdk_id='';
CREATE INDEX chat_messages_chronology ON public.chat_messages(user_id,created_at,id);

CREATE TABLE public.goal_movements (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL DEFAULT auth.uid(),
 goal_id uuid NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
 action text NOT NULL CHECK (action IN ('aporte','retirada','correcao','estorno','saldo_inicial')),
 amount numeric(14,2) NOT NULL, balance_before numeric(14,2) NOT NULL, balance_after numeric(14,2) NOT NULL,
 reference_id uuid REFERENCES public.goal_movements(id), reason text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
GRANT SELECT ON public.goal_movements TO authenticated;
GRANT ALL ON public.goal_movements TO service_role;
ALTER TABLE public.goal_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own goal movements" ON public.goal_movements FOR SELECT TO authenticated USING (user_id=auth.uid());

CREATE TABLE public.goal_movement_proposals (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL DEFAULT auth.uid(),
 goal_id uuid NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
 action text NOT NULL CHECK (action IN ('aporte','retirada','correcao','estorno')),
 amount numeric(14,2) NOT NULL, delta numeric(14,2) NOT NULL, expected_balance numeric(14,2) NOT NULL,
 reference_id uuid REFERENCES public.goal_movements(id), reason text NOT NULL DEFAULT '',
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','confirmed','cancelled')),
 request_key text NOT NULL, created_at timestamptz NOT NULL DEFAULT clock_timestamp(), UNIQUE(user_id,request_key)
);
GRANT SELECT,INSERT,UPDATE ON public.goal_movement_proposals TO authenticated;
GRANT ALL ON public.goal_movement_proposals TO service_role;
ALTER TABLE public.goal_movement_proposals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own proposals" ON public.goal_movement_proposals FOR ALL TO authenticated USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid());

CREATE FUNCTION public.audit_goal_balance() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_before numeric; v_action text; v_reference uuid;
BEGIN
 IF TG_OP='INSERT' THEN v_before:=0; ELSE v_before:=OLD.valor_atual; END IF;
 IF NEW.valor_atual<0 THEN RAISE EXCEPTION 'O saldo da meta não pode ficar negativo.'; END IF;
 IF NEW.valor_atual<>v_before THEN
  v_action:=COALESCE(NULLIF(current_setting('orca.goal_action',true),''),CASE WHEN TG_OP='INSERT' THEN 'saldo_inicial' WHEN NEW.valor_atual>v_before THEN 'aporte' ELSE 'retirada' END);
  v_reference:=NULLIF(current_setting('orca.goal_reference',true),'')::uuid;
  INSERT INTO public.goal_movements(user_id,goal_id,action,amount,balance_before,balance_after,reference_id,reason)
  VALUES(NEW.user_id,NEW.id,v_action,NEW.valor_atual-v_before,v_before,NEW.valor_atual,v_reference,COALESCE(current_setting('orca.goal_reason',true),''));
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.audit_goal_balance() FROM PUBLIC;
CREATE TRIGGER audit_goal_balance AFTER INSERT OR UPDATE OF valor_atual ON public.goals FOR EACH ROW EXECUTE FUNCTION public.audit_goal_balance();

CREATE FUNCTION public.prepare_goal_movement(p_goal_id uuid,p_action text,p_amount numeric,p_reason text,p_request_key text,p_reference_id uuid DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE g public.goals; proposal public.goal_movement_proposals; m public.goal_movements; effective numeric; d numeric;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Faça login para continuar.'; END IF;
 SELECT * INTO proposal FROM public.goal_movement_proposals WHERE user_id=auth.uid() AND request_key=p_request_key;
 IF FOUND THEN RETURN to_jsonb(proposal); END IF;
 SELECT * INTO g FROM public.goals WHERE id=p_goal_id AND user_id=auth.uid();
 IF NOT FOUND THEN RAISE EXCEPTION 'Meta não encontrada.'; END IF;
 IF p_action NOT IN ('aporte','retirada','correcao','estorno') THEN RAISE EXCEPTION 'Operação inválida.'; END IF;
 IF p_action<>'estorno' AND (p_amount IS NULL OR p_amount<0 OR (p_action<>'correcao' AND p_amount=0) OR p_amount<>round(p_amount,2)) THEN RAISE EXCEPTION 'Informe um valor válido em reais.'; END IF;
 IF p_action IN ('correcao','estorno') THEN
  SELECT a.* INTO m FROM public.goal_movements a WHERE a.user_id=auth.uid() AND a.goal_id=g.id AND a.action='aporte' AND (p_reference_id IS NULL OR a.id=p_reference_id)
   AND NOT EXISTS(SELECT 1 FROM public.goal_movements r WHERE r.reference_id=a.id AND r.action='estorno') ORDER BY a.created_at DESC,a.id DESC LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'Não há aporte com histórico para corrigir. Para valores antigos, informe quanto deseja retirar da meta.'; END IF;
  SELECT m.amount+COALESCE(SUM(amount),0) INTO effective FROM public.goal_movements WHERE reference_id=m.id;
  IF p_action='estorno' THEN d:=-effective; ELSE d:=p_amount-effective; END IF;
 ELSE d:=CASE WHEN p_action='aporte' THEN p_amount ELSE -p_amount END;
 END IF;
 IF g.valor_atual+d<0 THEN RAISE EXCEPTION 'A retirada ultrapassa o saldo da meta.'; END IF;
 IF d=0 THEN RAISE EXCEPTION 'O valor já está correto.'; END IF;
 INSERT INTO public.goal_movement_proposals(goal_id,action,amount,delta,expected_balance,reference_id,reason,request_key)
 VALUES(g.id,p_action,CASE WHEN p_action='estorno' THEN effective ELSE p_amount END,d,g.valor_atual,m.id,COALESCE(p_reason,''),p_request_key) RETURNING * INTO proposal;
 RETURN to_jsonb(proposal)||jsonb_build_object('titulo',g.titulo,'balance_after',g.valor_atual+d);
END $$;
REVOKE ALL ON FUNCTION public.prepare_goal_movement(uuid,text,numeric,text,text,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.prepare_goal_movement(uuid,text,numeric,text,text,uuid) TO authenticated;

CREATE FUNCTION public.confirm_goal_movement(p_proposal_id uuid,p_approved boolean) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE proposal public.goal_movement_proposals; g public.goals;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Faça login para continuar.'; END IF;
 SELECT * INTO proposal FROM public.goal_movement_proposals WHERE id=p_proposal_id AND user_id=auth.uid() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Confirmação não encontrada.'; END IF;
 SELECT * INTO g FROM public.goals WHERE id=proposal.goal_id AND user_id=auth.uid() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Meta não encontrada.'; END IF;
 IF proposal.status<>'pending' THEN RETURN jsonb_build_object('status',proposal.status,'meta',to_jsonb(g)); END IF;
 IF NOT p_approved THEN UPDATE public.goal_movement_proposals SET status='cancelled' WHERE id=proposal.id; RETURN jsonb_build_object('status','cancelled','meta',to_jsonb(g)); END IF;
 IF proposal.created_at<clock_timestamp()-interval '24 hours' THEN RAISE EXCEPTION 'Confirmação expirada. Peça novamente ao Orça.'; END IF;
 IF g.valor_atual<>proposal.expected_balance THEN RAISE EXCEPTION 'O saldo mudou. Peça novamente ao Orça antes de confirmar.'; END IF;
 IF g.valor_atual+proposal.delta<0 THEN RAISE EXCEPTION 'A retirada ultrapassa o saldo da meta.'; END IF;
 PERFORM set_config('orca.goal_action',proposal.action,true);
 PERFORM set_config('orca.goal_reference',COALESCE(proposal.reference_id::text,''),true);
 PERFORM set_config('orca.goal_reason',proposal.reason,true);
 UPDATE public.goals SET valor_atual=valor_atual+proposal.delta WHERE id=g.id RETURNING * INTO g;
 UPDATE public.goal_movement_proposals SET status='confirmed' WHERE id=proposal.id;
 RETURN jsonb_build_object('status','confirmed','meta',to_jsonb(g));
END $$;
REVOKE ALL ON FUNCTION public.confirm_goal_movement(uuid,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirm_goal_movement(uuid,boolean) TO authenticated;