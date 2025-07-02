
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getPollResults, type PollResult } from '@/data/polls';
import { Loader2, X, Users, PieChart as PieChartIcon } from 'lucide-react';
import { ChartConfig, ChartContainer, ChartTooltipContent } from "@/components/ui/chart";

const GENDER_COLORS = { Male: '#3b82f6', Female: '#ec4899', Other: '#f97316', Unknown: '#6b7280' };
const OPTION_COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

interface PollResultsProps {
  pollId: string;
  onClose: () => void;
}

export default function PollResults({ pollId, onClose }: PollResultsProps) {
  const [results, setResults] = useState<PollResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (pollId) {
      setIsLoading(true);
      const fetchResults = async () => {
        const data = await getPollResults(pollId);
        setResults(data);
        setIsLoading(false);
      };
      fetchResults();
    }
  }, [pollId]);

  if (isLoading) {
    return (
      <Card className="mt-6">
        <CardHeader><CardTitle>Loading Results...</CardTitle></CardHeader>
        <CardContent className="flex justify-center items-center h-64">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!results) {
    return (
      <Card className="mt-6">
        <CardHeader><CardTitle>Error</CardTitle></CardHeader>
        <CardContent><p>Could not load results for this poll.</p></CardContent>
      </Card>
    );
  }

  const genderChartConfig: ChartConfig = results.genderDistribution.reduce((acc, gender) => {
    acc[gender.name] = {
      label: gender.name,
      color: GENDER_COLORS[gender.name as keyof typeof GENDER_COLORS] || '#a8a29e',
    };
    return acc;
  }, {} as ChartConfig);
  

  return (
    <Card className="mt-6 animate-in fade-in-0" id="poll-results-section">
      <CardHeader className="flex flex-row justify-between items-start">
        <div>
          <CardTitle className="text-2xl font-headline">Results for: {results.pollTitle}</CardTitle>
          <CardDescription>A detailed analysis of user responses.</CardDescription>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
          <span className="sr-only">Close results</span>
        </Button>
      </CardHeader>
      <CardContent className="space-y-8">
        {results.totalResponses > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-secondary/50">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-base font-medium">Total Responses</CardTitle>
                        <Users className="h-5 w-5 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold">{results.totalResponses}</div>
                        <p className="text-xs text-muted-foreground">participants</p>
                    </CardContent>
                </Card>
                <Card className="bg-secondary/50">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-base font-medium">Gender Distribution</CardTitle>
                         <PieChartIcon className="h-5 w-5 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                         <ChartContainer config={genderChartConfig} className="mx-auto aspect-square h-[150px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                <Tooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                                <Pie data={results.genderDistribution} dataKey="value" nameKey="name" innerRadius={30}>
                                    {results.genderDistribution.map((entry) => (
                                        <Cell key={entry.name} fill={`var(--color-${entry.name})`} />
                                    ))}
                                </Pie>
                                <Legend layout="vertical" align="right" verticalAlign="middle" iconSize={10} wrapperStyle={{ fontSize: '14px', paddingLeft: '20px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    </CardContent>
                </Card>
            </div>
            
            <div className="space-y-6">
                {results.questions.map((question, index) => {
                    const questionChartConfig = question.answers.reduce((acc, answer, i) => {
                        acc[answer.name] = { label: answer.name, color: OPTION_COLORS[i % OPTION_COLORS.length] };
                        return acc;
                    }, {} as ChartConfig);

                    return (
                        <Card key={question.id} className="border-border/50">
                            <CardHeader>
                                <CardTitle className="text-lg">Question {index + 1}: {question.text}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ChartContainer config={questionChartConfig} className="mx-auto aspect-video h-[250px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                        <Tooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                                        <Pie data={question.answers} dataKey="value" nameKey="name" outerRadius={80}>
                                            {question.answers.map((entry, i) => (
                                            <Cell key={entry.name} fill={`var(--color-${entry.name})`} />
                                            ))}
                                        </Pie>
                                        <Legend />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </ChartContainer>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>
          </>
        ) : (
          <div className="text-center py-16">
            <p className="text-muted-foreground">There are no responses for this poll yet.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
