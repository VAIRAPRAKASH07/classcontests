-- Seed default score config
INSERT INTO public.score_configs (
  is_active,
  weight_problems_solved,
  weight_cf_rating,
  weight_lc_rating,
  weight_cc_rating,
  weight_atcoder_rating,
  weight_contests,
  weight_streak,
  inactive_days_threshold,
  tier_elite_min_solved,
  tier_advanced_min_solved,
  tier_intermediate_min_solved,
  anonymize_student_names
) VALUES (
  true,
  0.35,
  0.20,
  0.20,
  0.10,
  0.05,
  0.05,
  0.05,
  14,
  400,
  250,
  100,
  false
) ON CONFLICT DO NOTHING;
