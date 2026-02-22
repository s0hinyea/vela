CREATE TABLE public.chat_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    medication_id UUID REFERENCES public.medications(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Enable RLS (though backend uses service role, good practice)
ALTER TABLE public.chat_logs ENABLE ROW LEVEL SECURITY;

-- Allow read/write to authenticated users based on profile_id
CREATE POLICY "Users can insert their own chat logs" 
ON public.chat_logs FOR INSERT 
WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can read their own chat logs" 
ON public.chat_logs FOR SELECT 
USING (auth.uid() = profile_id);
