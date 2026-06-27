interface StepIndicatorProps {
  steps: string[];
  currentStep: number;
}

export default function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-0">
      {steps.map((step, i) => (
        <div key={i} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-colors
                ${i < currentStep ? 'bg-brand-600 border-brand-600 text-white' : ''}
                ${i === currentStep ? 'bg-white border-brand-600 text-brand-600' : ''}
                ${i > currentStep ? 'bg-white border-gray-200 text-gray-400' : ''}
              `}
            >
              {i < currentStep ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : (
                i + 1
              )}
            </div>
            <span className={`mt-1 text-xs font-medium whitespace-nowrap hidden sm:block
              ${i === currentStep ? 'text-brand-600' : 'text-gray-400'}
            `}>
              {step}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`h-0.5 w-8 sm:w-16 mx-1 mb-4 sm:mb-0 transition-colors ${i < currentStep ? 'bg-brand-600' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  );
}
