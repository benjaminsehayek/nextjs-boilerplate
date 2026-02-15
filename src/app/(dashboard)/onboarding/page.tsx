'use client';

import { useState } from 'react';

const steps = ['Domain', 'Business', 'Services'];

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(0);

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-display mb-8 text-center">
        <span className="text-flame-500">Business Setup</span>
      </h1>

      <div className="flex justify-between mb-12">
        {steps.map((step, index) => (
          <div key={step} className="flex-1">
            <div className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-display ${
                  index <= currentStep
                    ? 'bg-flame-gradient text-white'
                    : 'bg-char-700 text-ash-400'
                }`}
              >
                {index + 1}
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 ${
                    index < currentStep ? 'bg-flame-500' : 'bg-char-700'
                  }`}
                />
              )}
            </div>
            <div className="text-sm mt-2 text-ash-300">{step}</div>
          </div>
        ))}
      </div>

      <div className="card p-8 text-center">
        <div className="text-6xl mb-4">🚀</div>
        <h2 className="text-xl font-display mb-4">Onboarding Flow</h2>
        <p className="text-ash-400 mb-6">
          This multi-step wizard will collect your business information.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            className="btn-ghost"
          >
            Previous
          </button>
          <button
            onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))}
            disabled={currentStep === steps.length - 1}
            className="btn-primary"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
