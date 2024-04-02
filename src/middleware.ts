import { authMiddleware } from '@clerk/nextjs';

export default authMiddleware({
  afterAuth: async () => console.log(`User authenticated 4247`),
});

export const config = {
  matcher: ['/((?!.+.[w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
};
