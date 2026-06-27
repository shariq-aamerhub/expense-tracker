import Card from '@/components/ui/Card';

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon?: React.ReactNode;
  accent?: 'blue' | 'green' | 'red' | 'orange' | 'purple';
}

const accents = {
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-green-50 text-green-600',
  red: 'bg-red-50 text-red-600',
  orange: 'bg-orange-50 text-orange-600',
  purple: 'bg-purple-50 text-purple-600',
};

export default function StatCard({ title, value, subtitle, icon, accent = 'blue' }: StatCardProps) {
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>}
        </div>
        {icon && (
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${accents[accent]}`}>
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}
