/**
 * Conventional Commits — ver README.md ("Fluxo de contribuição").
 * O hook commit-msg valida isto e não se contorna com --no-verify.
 */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    /* As descrições deste projeto são em pt-PT, onde a maiúscula inicial é
       normal; a regra por omissão do config-conventional rejeitava-as. */
    'subject-case': [0],
    'header-max-length': [2, 'always', 100],
  },
}
