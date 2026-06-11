import { supabase } from '@/lib/supabaseClient';

// Pinged daily by Vercel cron (see vercel.json) so the Supabase free-tier
// project never hits the 7-day inactivity pause.
export async function GET() {
    const { count, error } = await supabase
        .from('Person')
        .select('*', { count: 'exact', head: true });

    if (error) {
        return Response.json({ ok: false, error: error.message }, { status: 500 });
    }
    return Response.json({ ok: true, people: count, pingedAt: new Date().toISOString() });
}
