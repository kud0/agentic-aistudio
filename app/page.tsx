import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-blue-950 dark:to-indigo-950">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute inset-0 bg-grid-slate-100 dark:bg-grid-slate-800 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] dark:[mask-image:linear-gradient(0deg,rgba(0,0,0,0.8),rgba(0,0,0,0.4))]" />
        <div className="absolute top-0 right-0 -mr-40 -mt-40 h-80 w-80 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 opacity-20 blur-3xl" />
        <div className="absolute bottom-0 left-0 -ml-40 -mb-40 h-80 w-80 rounded-full bg-gradient-to-tr from-purple-400 to-pink-500 opacity-20 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-5xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-7xl">
              Agentic AI Studio
            </h1>
            <p className="mt-6 text-xl leading-8 text-slate-600 dark:text-slate-300">
              Transform your ideas into strategies with AI-powered research and analysis
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link
                href="/signup"
                className="rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg transition-all hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              >
                Get Started
              </Link>
              <Link
                href="/login"
                className="rounded-full border border-slate-300 bg-white/80 px-8 py-3.5 text-base font-semibold text-slate-900 backdrop-blur-sm transition-all hover:bg-white hover:border-slate-400 dark:border-slate-700 dark:bg-slate-800/80 dark:text-white dark:hover:bg-slate-800"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              Powerful AI-Driven Features
            </h2>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">
              Everything you need to research, strategize, and refine your ideas
            </p>
          </div>

          <div className="mx-auto mt-16 max-w-7xl">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
              {/* Feature 1: AI Research */}
              <div className="group relative overflow-hidden rounded-2xl bg-white/80 p-8 shadow-lg backdrop-blur-sm transition-all hover:shadow-xl dark:bg-slate-900/80">
                <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 opacity-10 blur-2xl transition-all group-hover:opacity-20" />
                <div className="relative">
                  <div className="inline-flex rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 p-3 shadow-lg">
                    <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
                    </svg>
                  </div>
                  <h3 className="mt-6 text-xl font-semibold text-slate-900 dark:text-white">
                    AI Research
                  </h3>
                  <p className="mt-3 text-base leading-7 text-slate-600 dark:text-slate-400">
                    Leverage advanced AI to conduct comprehensive market analysis and uncover valuable insights that drive strategic decisions.
                  </p>
                </div>
              </div>

              {/* Feature 2: Strategic Planning */}
              <div className="group relative overflow-hidden rounded-2xl bg-white/80 p-8 shadow-lg backdrop-blur-sm transition-all hover:shadow-xl dark:bg-slate-900/80">
                <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 opacity-10 blur-2xl transition-all group-hover:opacity-20" />
                <div className="relative">
                  <div className="inline-flex rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 p-3 shadow-lg">
                    <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
                    </svg>
                  </div>
                  <h3 className="mt-6 text-xl font-semibold text-slate-900 dark:text-white">
                    Strategic Planning
                  </h3>
                  <p className="mt-3 text-base leading-7 text-slate-600 dark:text-slate-400">
                    Generate data-driven recommendations and actionable strategies tailored to your specific goals and market conditions.
                  </p>
                </div>
              </div>

              {/* Feature 3: Content Critique */}
              <div className="group relative overflow-hidden rounded-2xl bg-white/80 p-8 shadow-lg backdrop-blur-sm transition-all hover:shadow-xl dark:bg-slate-900/80">
                <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 opacity-10 blur-2xl transition-all group-hover:opacity-20" />
                <div className="relative">
                  <div className="inline-flex rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 p-3 shadow-lg">
                    <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                    </svg>
                  </div>
                  <h3 className="mt-6 text-xl font-semibold text-slate-900 dark:text-white">
                    Content Critique
                  </h3>
                  <p className="mt-3 text-base leading-7 text-slate-600 dark:text-slate-400">
                    Receive expert-level feedback on your strategies and content with AI-powered quality analysis and improvement suggestions.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="relative py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              Why Choose Agentic AI Studio?
            </h2>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">
              Built for modern teams who need fast, reliable AI assistance
            </p>
          </div>

          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-2">
              <div className="relative pl-12">
                <dt className="text-base font-semibold leading-7 text-slate-900 dark:text-white">
                  <div className="absolute left-0 top-0 flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600">
                    <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                    </svg>
                  </div>
                  Lightning Fast Results
                </dt>
                <dd className="mt-2 text-base leading-7 text-slate-600 dark:text-slate-400">
                  Get comprehensive analysis and insights in seconds, not hours. Our AI agents work in parallel to deliver results faster.
                </dd>
              </div>

              <div className="relative pl-12">
                <dt className="text-base font-semibold leading-7 text-slate-900 dark:text-white">
                  <div className="absolute left-0 top-0 flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-purple-600 to-pink-600">
                    <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                    </svg>
                  </div>
                  Enterprise-Grade Security
                </dt>
                <dd className="mt-2 text-base leading-7 text-slate-600 dark:text-slate-400">
                  Your data is protected with industry-standard encryption and strict access controls. Full RLS security on all endpoints.
                </dd>
              </div>

              <div className="relative pl-12">
                <dt className="text-base font-semibold leading-7 text-slate-900 dark:text-white">
                  <div className="absolute left-0 top-0 flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-600 to-teal-600">
                    <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
                    </svg>
                  </div>
                  Data-Driven Insights
                </dt>
                <dd className="mt-2 text-base leading-7 text-slate-600 dark:text-slate-400">
                  Make informed decisions backed by AI-powered market research and competitive analysis from multiple sources.
                </dd>
              </div>

              <div className="relative pl-12">
                <dt className="text-base font-semibold leading-7 text-slate-900 dark:text-white">
                  <div className="absolute left-0 top-0 flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-orange-600 to-red-600">
                    <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                    </svg>
                  </div>
                  Continuous Improvement
                </dt>
                <dd className="mt-2 text-base leading-7 text-slate-600 dark:text-slate-400">
                  Our AI learns from every interaction, providing increasingly refined and relevant suggestions over time.
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-slate-200 bg-white/50 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/50">
        <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex flex-col items-center gap-2 sm:items-start">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Agentic AI Studio
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Transform ideas into strategies with AI
              </p>
            </div>
            <div className="flex gap-8">
              <Link
                href="/about"
                className="text-sm text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              >
                About
              </Link>
              <Link
                href="/docs"
                className="text-sm text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              >
                Documentation
              </Link>
              <Link
                href="/pricing"
                className="text-sm text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              >
                Pricing
              </Link>
              <Link
                href="/contact"
                className="text-sm text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              >
                Contact
              </Link>
            </div>
          </div>
          <div className="mt-8 border-t border-slate-200 pt-8 text-center dark:border-slate-800">
            <p className="text-sm text-slate-500 dark:text-slate-500">
              © {new Date().getFullYear()} Agentic AI Studio. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
