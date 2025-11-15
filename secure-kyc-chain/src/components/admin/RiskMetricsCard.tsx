import { memo, Suspense, lazy } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { RiskMetrics, KYCApplication } from '@/types/kyc';
import { TrendingUp, Clock, Users, Shield } from 'lucide-react';

// Lazy load chart components - only when tab is active
const PieChartComponent = lazy(() => 
  import('recharts').then(recharts => {
    const { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } = recharts;
    return {
      default: ({ data }: { data: Array<{ name: string; value: number; color: string }> }) => (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }: any) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      )
    };
  })
);

const BarChartComponent = lazy(() => 
  import('recharts').then(recharts => {
    const { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } = recharts;
    return {
      default: ({ data }: { data: Array<{ name: string; count: number }> }) => (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )
    };
  })
);

interface RiskMetricsCardProps {
  metrics: RiskMetrics;
  applications: KYCApplication[];
}

export const RiskMetricsCard = memo(({ metrics, applications }: RiskMetricsCardProps) => {
  const statusData = [
    { name: 'Auto Approved', value: metrics.auto_approved, color: 'hsl(var(--success))' },
    { name: 'Manual Review', value: metrics.manual_reviews, color: 'hsl(var(--warning))' },
    { name: 'Rejected', value: metrics.rejected, color: 'hsl(var(--destructive))' },
  ];

  const riskDistribution = applications
    .filter(app => app.risk_score !== null)
    .reduce((acc, app) => {
      const score = app.risk_score!;
      if (score < 0.3) acc.low++;
      else if (score < 0.6) acc.medium++;
      else acc.high++;
      return acc;
    }, { low: 0, medium: 0, high: 0 });

  const riskChartData = [
    { name: 'Low Risk', count: riskDistribution.low },
    { name: 'Medium Risk', count: riskDistribution.medium },
    { name: 'High Risk', count: riskDistribution.high },
  ];

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Avg Risk Score</p>
                <p className="text-2xl font-bold">
                  {(metrics.avg_risk_score * 100).toFixed(0)}%
                </p>
              </div>
              <div className="p-3 bg-primary/10 rounded-xl">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
            </div>
            <Progress value={metrics.avg_risk_score * 100} className="mt-3" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Avg Process Time</p>
                <p className="text-2xl font-bold">{metrics.avg_processing_time}h</p>
              </div>
              <div className="p-3 bg-warning/10 rounded-xl">
                <Clock className="h-6 w-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Approval Rate</p>
                <p className="text-2xl font-bold">
                  {((metrics.auto_approved / metrics.total_applications) * 100).toFixed(0)}%
                </p>
              </div>
              <div className="p-3 bg-success/10 rounded-xl">
                <Shield className="h-6 w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Users</p>
                <p className="text-2xl font-bold">{metrics.total_applications}</p>
              </div>
              <div className="p-3 bg-accent/10 rounded-xl">
                <Users className="h-6 w-6 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Application Status Distribution</CardTitle>
            <CardDescription>Breakdown by processing outcome</CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<div className="h-[300px] flex items-center justify-center text-muted-foreground">Loading chart...</div>}>
              <PieChartComponent data={statusData} />
            </Suspense>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Risk Score Distribution</CardTitle>
            <CardDescription>Applications grouped by risk level</CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<div className="h-[300px] flex items-center justify-center text-muted-foreground">Loading chart...</div>}>
              <BarChartComponent data={riskChartData} />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </div>
  );
});

RiskMetricsCard.displayName = 'RiskMetricsCard';
