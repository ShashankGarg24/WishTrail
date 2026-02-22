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
    <div>      
      {isAtLimit && (
        <div className="border-red-200">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700 font-medium">
              You've reached your limit. You cannot create more at this time.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PremiumLimitIndicator;
