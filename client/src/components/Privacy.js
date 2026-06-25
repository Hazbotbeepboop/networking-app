import React from 'react'

export default function Privacy({ onBack }) {
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="max-w-xl mx-auto">

        <div className="mb-8">
          <button
            onClick={onBack || (() => window.history.back())}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors mb-6 block"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-medium tracking-widest text-gray-900">
            VAR<span className="text-[#B08D57]">Y</span>S
          </h1>
          <p className="text-sm text-gray-400 mt-1">Privacy &amp; Data</p>
        </div>

        <div className="space-y-8 text-sm text-gray-600 leading-relaxed">

          <section>
            <h2 className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-3">What we collect</h2>
            <ul className="space-y-2">
              <li>Your email address and password — passwords are hashed and never stored in readable form</li>
              <li>Your profile information — name, role, company, goals, and context you provide</li>
              <li>Contact records you add — names, roles, notes, and relationship context</li>
              <li>Conversations and journal entries you write</li>
              <li>Actions Varys suggests and their outcomes</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-3">How your data is used</h2>
            <p>
              Your data is used solely to provide the Varys service — generating insights, drafting emails, and producing your weekly digest. We do not sell, share, or use your data for advertising, profiling, or any purpose outside the app.
            </p>
          </section>

          <section>
            <h2 className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-3">AI processing</h2>
            <p>
              When you submit a capture or chat with Varys, your text is sent to Anthropic's Claude AI to generate analysis and suggestions. This is processed per-request — we do not retain data with Anthropic beyond individual API calls. Anthropic's own{' '}
              <a
                href="https://www.anthropic.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-gray-800"
              >
                privacy policy
              </a>{' '}
              applies to this processing.
            </p>
          </section>

          <section>
            <h2 className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-3">Your data is private</h2>
            <p>
              Only you can see your contacts, conversations, and network intelligence. Data is scoped to your account and is not visible to other users or shared externally.
            </p>
          </section>

          <section>
            <h2 className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-3">Deleting your account</h2>
            <p>
              You can delete your account and all associated data at any time from your Profile tab. Deletion is immediate and permanent — contacts, conversations, actions, and your profile are all removed.
            </p>
          </section>

          <section>
            <h2 className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-3">Beta</h2>
            <p>
              Varys is currently in private beta. As the product evolves, this policy may be updated. Any significant changes will be communicated directly to users.
            </p>
          </section>

        </div>

        <div className="mt-12 pt-6 border-t border-gray-200 text-xs text-gray-300">
          Last updated June 2026
        </div>

      </div>
    </div>
  )
}
