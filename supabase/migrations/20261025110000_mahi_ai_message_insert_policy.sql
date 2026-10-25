-- Let authenticated guests save their own messages in the current Cyrus UI.
-- The composite foreign key on (conversation_id, user_id) additionally guarantees
-- the message points at a conversation owned by the same user.
GRANT INSERT ON public.mahi_ai_messages TO authenticated;

DROP POLICY IF EXISTS "Users can create their own Mahi AI messages" ON public.mahi_ai_messages;
CREATE POLICY "Users can create their own Mahi AI messages"
  ON public.mahi_ai_messages
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

NOTIFY pgrst, 'reload schema';
