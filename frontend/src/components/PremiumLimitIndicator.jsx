import { AlertCircle, TrendingUp, Crown } from 'lucide-react';

const PremiumLimitIndicator = ({ 
  current, 
  max, 
  label = 'Usage',
  showUpgradeButton = true,
  onUpgradeClick,
  className = '' 
}) => {
  const isInfinite = max === '∞' || max === -1;
  const percentage = isInfinite ? 0 : Math.min(100, (current / max) * 100);
  const remaining = isInfinite ? '∞' : Math.max(0, max - current);
  const isNearLimit = percentage >= 80 && !isInfinite;
  const isAtLimit = percentage >= 100 && !isInfinite;
  
  let barColor = 'from-blue-500 to-blue-600';
  let bgColor = 'bg-blue-50';
  let textColor = 'text-blue-700';
  let iconColor = 'text-blue-600';
  
  if (isAtLimit) {
    barColor = 'from-red-500 to-red-600';
    bgColor = 'bg-red-50';
    textColor = 'text-red-700';
    iconColor = 'text-red-600';
  } else if (isNearLimit) {
    barColor = 'from-orange-500 to-orange-600';
    bgColor = 'bg-orange-50';
    textColor = 'text-orange-700';
    iconColor = 'text-orange-600';
  }
  
  return (
    <div className={`${bgColor} rounded-xl p-4 border-2 ${isAtLimit ? 'border-red-200' : isNearLimit ? 'border-orange-200' : 'border-blue-200'} ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <TrendingUp className={`w-5 h-5 ${iconColor}`} />
          <span className="font-semibold text-gray-900">{label}</span>
        </div>
        <span className={`font-bold text-lg ${textColor}`}>
          {current} / {isInfinite ? '∞' : max}
        </span>
      </div>
      
      {!isInfinite && (
        <>
          <div className="relative w-full bg-gray-200 rounded-full h-3 overflow-hidden mb-2">
            <div 
              className={`absolute top-0 left-0 h-full bg-gradient-to-r ${barColor} transition-all duration-500 ease-out shadow-lg`}
              style={{ width: `${percentage}%` }}
            >
              <div className="absolute inset-0 bg-white/20 animate-pulse" />
            </div>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">
              {remaining} remaining
            </span>
            <span className={`font-medium ${textColor}`}>
              {Math.round(percentage)}% used
            </span>
          </div>
        </>
      )}
      
      {isAtLimit && (
        <div className="mt-3 pt-3 border-t-2 border-red-200">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700 font-medium">
              You've reached your limit. You cannot create more at this time.
            </p>
          </div>
        </div>
      )}
      
      {isNearLimit && !isAtLimit && (
        <div className="mt-3 pt-3 border-t-2 border-orange-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-orange-600 flex-shrink-0" />
            <p className="text-xs text-orange-700 font-medium">
              Approaching limit
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PremiumLimitIndicator;
