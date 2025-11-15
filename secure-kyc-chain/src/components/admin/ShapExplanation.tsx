import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ShapFeature } from '@/types/kyc';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface ShapExplanationProps {
  features: ShapFeature[];
  riskScore: number;
}

export const ShapExplanation = ({ features, riskScore }: ShapExplanationProps) => {
  const getRiskLevel = (score: number) => {
    if (score < 0.3) return { label: 'Low Risk', color: 'text-success' };
    if (score < 0.6) return { label: 'Medium Risk', color: 'text-warning' };
    return { label: 'High Risk', color: 'text-destructive' };
  };

  const riskLevel = getRiskLevel(riskScore);

  const getImpactColor = (value: number) => {
    const absValue = Math.abs(value);
    if (absValue > 0.2) return value > 0 ? 'bg-destructive' : 'bg-success';
    if (absValue > 0.1) return value > 0 ? 'bg-warning' : 'bg-primary';
    return 'bg-muted';
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Risk Score Analysis</CardTitle>
          <CardDescription>
            ML model prediction with SHAP explainability
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Overall Risk Score</span>
              <Badge className={riskLevel.color}>
                {riskLevel.label}
              </Badge>
            </div>
            <div className="flex items-center gap-4">
              <Progress value={riskScore * 100} className="flex-1" />
              <span className="text-2xl font-bold min-w-[60px] text-right">
                {(riskScore * 100).toFixed(0)}%
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold text-sm">Feature Impact Analysis</h4>
            <p className="text-sm text-muted-foreground">
              Top factors influencing the risk assessment:
            </p>

            <div className="space-y-3">
              {features.map((feature, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      {feature.shap_value > 0 ? (
                        <TrendingUp className="h-4 w-4 text-destructive" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-success" />
                      )}
                      <span className="font-medium">{feature.feature}</span>
                    </div>
                    <span className="text-muted-foreground">
                      {String(feature.feature_value)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full ${getImpactColor(feature.shap_value)}`}
                        style={{
                          width: `${Math.abs(feature.shap_value) * 200}%`,
                          marginLeft: feature.shap_value < 0 ? 'auto' : '0',
                        }}
                      />
                    </div>
                    <span className="text-xs font-mono min-w-[60px] text-right">
                      {feature.shap_value > 0 ? '+' : ''}
                      {feature.shap_value.toFixed(3)}
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground pl-6">
                    {feature.shap_value > 0
                      ? `Increases risk by ${Math.abs(feature.shap_value * 100).toFixed(1)}%`
                      : `Decreases risk by ${Math.abs(feature.shap_value * 100).toFixed(1)}%`}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <h4 className="font-semibold mb-2 text-sm">Human-Readable Summary</h4>
          <p className="text-sm text-muted-foreground leading-relaxed">
            The risk assessment is primarily driven by:
            {features.slice(0, 3).map((f, i) => (
              <span key={i}>
                {i === 0 ? ' ' : i === features.slice(0, 3).length - 1 ? ', and ' : ', '}
                <strong>{f.feature.toLowerCase()}</strong>
                {' '}({f.shap_value > 0 ? '+' : ''}{(f.shap_value * 100).toFixed(1)}%)
              </span>
            ))}
            . {riskScore > 0.5 
              ? 'Manual review recommended due to elevated risk indicators.' 
              : 'Application shows low risk profile and may qualify for auto-approval.'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
