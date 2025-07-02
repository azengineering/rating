import { getAllActivities, type UserActivity } from "@/data/leaders";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";

export default async function AdminRatingsPage() {
    const activities = await getAllActivities();

    return (
        <Card>
            <CardHeader>
                <CardTitle>Ratings & Comments</CardTitle>
                <CardDescription>A list of all ratings and comments submitted by users.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Leader</TableHead>
                            <TableHead>User</TableHead>
                            <TableHead>Rating</TableHead>
                            <TableHead>Comment</TableHead>
                            <TableHead>Date</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {activities.map((activity, index) => (
                            <TableRow key={`${activity.leaderId}-${activity.userName}-${index}`}>
                                <TableCell className="font-medium">{activity.leaderName}</TableCell>
                                <TableCell>{activity.userName}</TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-1">
                                        <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                                        {activity.rating}
                                    </div>
                                </TableCell>
                                <TableCell className="max-w-xs truncate">{activity.comment || 'N/A'}</TableCell>
                                <TableCell>{new Date(activity.updatedAt).toLocaleDateString()}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
