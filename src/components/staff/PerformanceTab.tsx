import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, TrendingUp, Award, Clock } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const mockReviews = [
  { id: "1", period: "Q4 2023", rating: 4.8, status: "Completed", date: "2023-12-15", reviewer: "Admin" },
  { id: "2", period: "Q3 2023", rating: 4.5, status: "Completed", date: "2023-09-10", reviewer: "Admin" },
  { id: "3", period: "Q2 2023", rating: 4.7, status: "Completed", date: "2023-06-20", reviewer: "Manager" },
];

export function PerformanceTab() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Overall Rating</p>
                <p className="text-3xl font-bold">4.7 / 5.0</p>
              </div>
              <Star className="h-8 w-8 text-amber-400 fill-amber-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Kpis Met</p>
                <p className="text-3xl font-bold">92%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Next Review</p>
                <p className="text-3xl font-bold">Q1 2024</p>
              </div>
              <Clock className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card variant="elevated">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Performance Reviews
          </CardTitle>
          <CardDescription>Historical performance assessments and feedback</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Review Period</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Reviewer</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockReviews.map((review) => (
                <TableRow key={review.id}>
                  <TableCell className="font-medium">{review.period}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                      {review.rating}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-success/20 text-success border-success/30">
                      {review.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{review.date}</TableCell>
                  <TableCell>{review.reviewer}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
