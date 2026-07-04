import { ArrowUp, Circle } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ResponsePoint } from "@/constants/dashboard";

type ResponsesOverTimeChartProps = {
  data: ResponsePoint[];
};

function formatAxis(value: number) {
  if (value >= 1000) return `${value / 1000}K`;

  return `${value}`;
}

export function ResponsesOverTimeChart({ data }: ResponsesOverTimeChartProps) {
  return (
    <Card className="gap-0 rounded-xl border-border bg-card py-0 shadow-sm">
      <CardHeader className="flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="font-bold text-foreground text-lg">
          Responses Over Time
        </CardTitle>
        <CardAction className="col-auto row-auto justify-self-start sm:justify-self-end">
          <Select defaultValue="30">
            <SelectTrigger
              size="sm"
              className="h-8 min-w-[126px]"
              aria-label="Select chart period"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="14">Last 14 days</SelectItem>
                <SelectItem value="7">Last 7 days</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 px-5 pb-5">
        <div className="flex items-center gap-2 text-sm">
          <Circle className="size-3 fill-chart-1 text-chart-1" />
          <span className="font-medium text-foreground">Responses</span>
        </div>

        <div className="h-[246px] min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
            >
              <CartesianGrid
                stroke="var(--border)"
                strokeDasharray="2 4"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: "var(--border)" }}
                interval={5}
              />
              <YAxis
                tickFormatter={formatAxis}
                tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                cursor={{ stroke: "var(--chart-1)", strokeOpacity: 0.2 }}
                contentStyle={{
                  border: "1px solid var(--border)",
                  borderRadius: "10px",
                  background: "var(--card)",
                  color: "var(--foreground)",
                  boxShadow: "var(--shadow-md)",
                }}
              />
              <Line
                type="monotone"
                dataKey="responses"
                stroke="var(--chart-1)"
                strokeWidth={3}
                isAnimationActive={false}
                dot={{ r: 3, strokeWidth: 2, fill: "var(--card)" }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-muted-foreground text-sm">Total Responses</p>
            <p className="mt-1 font-bold text-foreground text-lg">24,532</p>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-muted-foreground text-xs">vs previous 30 days</p>
            <p className="mt-1 inline-flex items-center gap-1 font-semibold text-green-600">
              <ArrowUp className="size-4" aria-hidden="true" />
              18%
            </p>
          </div>
        </div>

        <p className="sr-only">
          Total responses are 24,532, up 18 percent versus the previous 30 days.
        </p>
      </CardContent>
    </Card>
  );
}
