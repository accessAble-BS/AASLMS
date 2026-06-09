import { supabase } from '@/lib/supabase';

export type LearnerProgressRow = {
  user_id: string;
  email: string;
  completed_modules: number;
  total_modules: number;
  last_activity: string | null;
};

/**
 * Record the current user's completion of a module.
 * Silent no-op if not logged in.
 */
export async function markModuleComplete(courseId: string, moduleId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from('lms_progress').upsert(
    { course_id: courseId, module_id: moduleId },
    { onConflict: 'user_id,course_id,module_id' },
  );
}

/**
 * Returns the set of module IDs completed by the current user for a course.
 */
export async function fetchCourseProgress(courseId: string): Promise<{
  completedModuleIds: string[];
  error: string | null;
}> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { completedModuleIds: [], error: null };

  const { data, error } = await supabase
    .from('lms_progress')
    .select('module_id')
    .eq('course_id', courseId)
    .eq('user_id', user.id);

  if (error) return { completedModuleIds: [], error: error.message };

  return {
    completedModuleIds: (data ?? []).map((row) => row.module_id as string),
    error: null,
  };
}

/**
 * For editors: aggregated progress of all learners on a course.
 * Returns one row per learner who has recorded at least one completion.
 */
export async function fetchCourseProgressSummary(
  courseId: string,
  totalModules: number,
): Promise<{ rows: LearnerProgressRow[]; error: string | null }> {
  // Pull all progress rows for this course then look up emails via profiles.
  const { data: progressData, error: progressError } = await supabase
    .from('lms_progress')
    .select('user_id, completed_at')
    .eq('course_id', courseId)
    .order('completed_at', { ascending: false });

  if (progressError) return { rows: [], error: progressError.message };
  if (!progressData || progressData.length === 0) return { rows: [], error: null };

  // Aggregate by user_id
  const byUser = new Map<string, { count: number; last: string }>();
  for (const row of progressData) {
    const uid = row.user_id as string;
    const at = row.completed_at as string;
    const existing = byUser.get(uid);
    if (!existing) {
      byUser.set(uid, { count: 1, last: at });
    } else {
      existing.count += 1;
      // rows are ordered desc so first occurrence is already newest
    }
  }

  const userIds = Array.from(byUser.keys());

  // Fetch profiles for emails
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('id, email')
    .in('id', userIds);

  const emailMap = new Map<string, string>();
  if (!profileError && profileData) {
    for (const p of profileData) {
      emailMap.set(p.id as string, p.email as string);
    }
  }

  const rows: LearnerProgressRow[] = userIds.map((uid) => {
    const agg = byUser.get(uid)!;
    return {
      user_id: uid,
      email: emailMap.get(uid) ?? uid,
      completed_modules: agg.count,
      total_modules: totalModules,
      last_activity: agg.last ?? null,
    };
  });

  // Sort by most completions desc
  rows.sort((a, b) => b.completed_modules - a.completed_modules);

  return { rows, error: null };
}
