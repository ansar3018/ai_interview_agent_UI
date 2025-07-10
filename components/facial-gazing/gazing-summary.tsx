import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Eye, TrendingUp, AlertCircle } from "lucide-react"

interface GazingSummaryData {
  attentionScore: number
  eyeContact: number
  engagementLevel: "High" | "Medium" | "Low"
  recommendations: string[]
}

interface GazingSummaryProps {
  data: GazingSummaryData
}

export function GazingSummary({ data }: GazingSummaryProps) {
  const getEngagementColor = (level: string) => {
    switch (level) {
      case "High":
        return "bg-green-100 text-green-800"
      case "Medium":
        return "bg-yellow-100 text-yellow-800"
      case "Low":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600"
    if (score >= 60) return "text-yellow-600"
    return "text-red-600"
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          Facial Gazing Analysis Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Attention Score */}
        <div className="text-center">
          <div className={`text-3xl font-bold mb-2 ${getScoreColor(data.attentionScore)}`}>
            {Math.round(data.attentionScore)}%
          </div>
          <div className="text-sm text-gray-600 mb-3">Attention Score</div>
          <Progress value={data.attentionScore} className="h-3 max-w-xs mx-auto" />
        </div>

        {/* Engagement Level */}
        <div className="text-center">
          <Badge className={getEngagementColor(data.engagementLevel)}>{data.engagementLevel} Engagement</Badge>
        </div>

        {/* Detailed Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-semibold text-green-600">{Math.round(data.eyeContact)}%</div>
            <div className="text-sm text-gray-600">Eye Contact</div>
          </div>

          {/* Remove Total Blinks UI */}

          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-semibold text-purple-600">
              {Math.round(100 - data.eyeContact)}%
            </div>
            <div className="text-sm text-gray-600">Looking Away</div>
          </div>
        </div>

        {/* Recommendations */}
        {data.recommendations.length > 0 && (
          <div>
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Recommendations
            </h4>
            <ul className="space-y-2">
              {data.recommendations.map((rec, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
