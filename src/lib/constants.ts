export const ROLE_SLUGS = {
  SUPER_ADMIN: 'super_admin',
  LMS_EDITOR: 'lms_editor',
  LMS_LEARNER: 'lms_learner',
} as const;

export const LMS_EDITOR_ROLES = [
  ROLE_SLUGS.SUPER_ADMIN,
  ROLE_SLUGS.LMS_EDITOR,
] as const;

export const LMS_ACCESS_ROLES = [
  ROLE_SLUGS.SUPER_ADMIN,
  ROLE_SLUGS.LMS_EDITOR,
  ROLE_SLUGS.LMS_LEARNER,
] as const;
