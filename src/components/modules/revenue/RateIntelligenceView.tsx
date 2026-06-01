'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BarChart3, Globe, Building2, TrendingUp } from 'lucide-react'

const competitorRates = [
  { hotel: 'The Grand Kathmandu (Ours)', barRate: 8500, suiteRate: 15000, standardRate: 6000 },
  { hotel: 'Hotel Yak & Yeti', barRate: 9200, suiteRate: 16500, standardRate: 7000 },
  { hotel: 'Soaltee Crown Plaza', barRate: 10500, suiteRate: 18000, standardRate: 8000 },
  { hotel: 'Hotel Annapurna', barRate: 7800, suiteRate: 14000, standardRate: 5500 },
  { hotel: 'Radisson Hotel KTM', barRate: 9000, suiteRate: 16000, standardRate: 6500 },
  { hotel: 'Hotel Shangri-La', barRate: 8800, suiteRate: 15500, standardRate: 6200 },
  { hotel: 'Kathmandu Marriott', barRate: 11000, suiteRate: 20000, standardRate: 8500 },
]

const marketInsights = [
  { metric: 'Average BAR (Market)', value: 'NPR 9,200', trend: 'up' },
  { metric: 'Our Position', value: 'NPR 8,500 (7th)', trend: 'down' },
  { metric: 'Price Gap to Leader', value: 'NPR 2,500', trend: 'neutral' },
  { metric: 'Market Occupancy', value: '72%', trend: 'up' },
]

export function RateIntelligenceView() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-6 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Rate Intelligence</h1>
          <p className="text-sm text-muted-foreground">Competitor rate comparison and market positioning</p>
        </div>
        <Badge variant="outline" className="text-sm">
          <BarChart3 className="h-3 w-3 mr-1" />
          Live Data
        </Badge>
      </div>

      {/* Market Insights */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {marketInsights.map((insight) => (
          <Card key={insight.metric} className="p-4">
            <p className="text-sm text-muted-foreground">{insight.metric}</p>
            <p className="text-lg font-bold mt-1">{insight.value}</p>
            <div className="flex items-center gap-1 mt-1">
              <TrendingUp className={`h-3 w-3 ${insight.trend === 'up' ? 'text-green-600' : insight.trend === 'down' ? 'text-red-600' : 'text-gray-400'}`} />
              <span className={`text-xs ${insight.trend === 'up' ? 'text-green-600' : insight.trend === 'down' ? 'text-red-600' : 'text-gray-400'}`}>
                {insight.trend === 'up' ? 'Trending Up' : insight.trend === 'down' ? 'Below Average' : 'Stable'}
              </span>
            </div>
          </Card>
        ))}
      </div>

      {/* Competitor Rate Table */}
      <Card>
        <CardContent className="p-0">
          <div className="p-4 pb-0 flex items-center gap-2">
            <Globe className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-base font-semibold">Competitor Rate Comparison</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left text-sm font-medium text-muted-foreground p-4">Hotel</th>
                  <th className="text-right text-sm font-medium text-muted-foreground p-4">Standard</th>
                  <th className="text-right text-sm font-medium text-muted-foreground p-4">Deluxe (BAR)</th>
                  <th className="text-right text-sm font-medium text-muted-foreground p-4">Suite</th>
                </tr>
              </thead>
              <tbody>
                {competitorRates.map((comp, idx) => {
                  const isOurs = comp.hotel.includes('Ours')
                  return (
                    <tr
                      key={comp.hotel}
                      className={`border-b last:border-0 ${isOurs ? 'bg-primary/5 dark:bg-primary/10' : ''}`}
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Building2 className={`h-4 w-4 ${isOurs ? 'text-primary' : 'text-muted-foreground'}`} />
                          <span className={`font-medium text-sm ${isOurs ? 'text-primary' : ''}`}>
                            {comp.hotel}
                          </span>
                          {isOurs && (
                            <Badge variant="outline" className="text-[10px] border-primary/30 bg-primary/5 text-primary">
                              YOU
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="text-right p-4 text-sm font-mono">
                        NPR {comp.standardRate.toLocaleString()}
                      </td>
                      <td className="text-right p-4 text-sm font-mono font-medium">
                        NPR {comp.barRate.toLocaleString()}
                      </td>
                      <td className="text-right p-4 text-sm font-mono">
                        NPR {comp.suiteRate.toLocaleString()}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Positioning Note */}
      <Card className="border-dashed">
        <CardContent className="p-4 flex items-start gap-3">
          <BarChart3 className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Rate Positioning Analysis</p>
            <p className="mt-1">
              The Grand Kathmandu is positioned in the <strong>competitive value</strong> segment, 
              offering rates 7-8% below the market leader while maintaining 5-star service standards. 
              Current BAR of NPR 8,500 is below the market average of NPR 9,200, representing 
              an opportunity to increase rates during high-demand periods.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
