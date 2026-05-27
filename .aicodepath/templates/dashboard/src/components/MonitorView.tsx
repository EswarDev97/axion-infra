import { useDatabase } from '../hooks/useDatabase';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';

interface AgentStatus {
  id: number;
  session_id: string | null;
  status: string;
  current_task: string | null;
  progress_percentage: number;
  updated_at: string;
}

interface Validation {
  id: number;
  artifact_id: number | null;
  file_path: string | null;
  validation_type: string;
  score: number | null;
  status: string | null;
  violations: string | null;
  validated_at: string;
  artifact_title: string | null;
}

interface ValidationSummary {
  validation_type: string;
  status: string;
  count: number;
  avg_score: number | null;
}

interface ArtifactStats {
  artifact_type: string;
  phase: string;
  count: number;
  last_updated: string;
}

interface Overview {
  counts: {
    workflows: number;
    artifacts: number;
    validations: number;
    activeAgents: number;
  };
  recentActivity: any[];
}

const COLORS = {
  safe: '#10b981',
  warning: '#f59e0b',
  critical: '#ef4444',
  PASS: '#10b981',
  REVIEW: '#f59e0b',
  FAIL: '#ef4444',
  running: '#3b82f6',
  idle: '#6b7280',
  paused: '#f59e0b',
  crashed: '#ef4444',
};

export function MonitorView() {
  const { data: agents } = useDatabase<AgentStatus[]>('/agent-status');
  const { data: validations } = useDatabase<Validation[]>('/validations');
  const { data: validationSummary } = useDatabase<ValidationSummary[]>('/validation-summary');
  const { data: artifactStats } = useDatabase<ArtifactStats[]>('/artifact-stats');
  const { data: overview } = useDatabase<Overview>('/overview');

  return (
    <div className="p-6 space-y-6">
      {/* Overview Cards */}
      <OverviewCards overview={overview} />

      {/* Agent Status */}
      <AgentStatusSection agents={agents} />

      {/* Validation Results */}
      <ValidationSection
        validations={validations}
        validationSummary={validationSummary}
      />

      {/* Artifact Statistics */}
      <ArtifactSection artifactStats={artifactStats} />
    </div>
  );
}

function OverviewCards({ overview }: { overview: Overview | null }) {
  if (!overview) return null;

  const cards = [
    { label: 'Workflows', value: overview.counts.workflows, color: 'bg-blue-500' },
    { label: 'Artifacts', value: overview.counts.artifacts, color: 'bg-green-500' },
    { label: 'Validations', value: overview.counts.validations, color: 'bg-purple-500' },
    { label: 'Active Agents', value: overview.counts.activeAgents, color: 'bg-orange-500' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div key={card.label} className="bg-white rounded-lg shadow p-6">
          <div className={`${card.color} text-white rounded-full w-12 h-12 flex items-center justify-center mb-3`}>
            <span className="text-2xl font-bold">{card.value}</span>
          </div>
          <div className="text-gray-600 font-medium">{card.label}</div>
        </div>
      ))}
    </div>
  );
}

function AgentStatusSection({ agents }: { agents: AgentStatus[] | null }) {
  if (!agents || agents.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-bold mb-4">Agent Status</h3>
        <p className="text-gray-500">No agent status data available</p>
      </div>
    );
  }

  const statusCounts = agents.reduce((acc, agent) => {
    acc[agent.status] = (acc[agent.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.entries(statusCounts).map(([name, value]) => ({
    name,
    value,
  }));

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-bold mb-4">Agent Status</h3>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <div>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={(entry) => `${entry.name}: ${entry.value}`}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[entry.name as keyof typeof COLORS] || '#94a3b8'} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Agent List */}
        <div className="space-y-3 max-h-[250px] overflow-y-auto">
          {agents.map((agent) => (
            <div key={agent.id} className="border-l-4 pl-3 py-2 border-blue-500">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="font-semibold text-sm">
                    Agent #{agent.id}
                    {agent.session_id && (
                      <span className="ml-2 text-xs text-gray-500 font-mono">
                        {agent.session_id.substring(0, 8)}
                      </span>
                    )}
                  </div>
                  {agent.current_task && (
                    <div className="text-sm text-gray-600 mt-1">{agent.current_task}</div>
                  )}
                </div>
                <span
                  className={`px-2 py-1 text-xs font-medium rounded ${
                    agent.status === 'running'
                      ? 'bg-green-100 text-green-800'
                      : agent.status === 'idle'
                      ? 'bg-gray-100 text-gray-800'
                      : agent.status === 'paused'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {agent.status}
                </span>
              </div>
              {agent.progress_percentage > 0 && (
                <div className="mt-2">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${agent.progress_percentage}%` }}
                    />
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{agent.progress_percentage}%</div>
                </div>
              )}
              <div className="text-xs text-gray-400 mt-1">
                Updated: {new Date(agent.updated_at).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ValidationSection({
  validations,
  validationSummary,
}: {
  validations: Validation[] | null;
  validationSummary: ValidationSummary[] | null;
}) {
  if (!validations && !validationSummary) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-bold mb-4">Validation Results</h3>
        <p className="text-gray-500">No validation data available</p>
      </div>
    );
  }

  // Prepare chart data
  const chartData = validationSummary?.map(item => ({
    name: `${item.validation_type} (${item.status})`,
    count: item.count,
    avg_score: item.avg_score || 0,
  })) || [];

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-bold mb-4">Validation Results</h3>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart */}
        {chartData.length > 0 && (
          <div>
            <h4 className="font-semibold mb-2">Validation Summary</h4>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#3b82f6" name="Count" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Recent Validations */}
        <div>
          <h4 className="font-semibold mb-2">Recent Validations</h4>
          <div className="space-y-2 max-h-[250px] overflow-y-auto">
            {validations?.slice(0, 10).map((val) => (
              <div
                key={val.id}
                className={`border-l-4 pl-3 py-2 ${
                  val.status === 'PASS'
                    ? 'border-green-500'
                    : val.status === 'REVIEW'
                    ? 'border-yellow-500'
                    : 'border-red-500'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-semibold text-sm">{val.validation_type}</div>
                    <div className="text-xs text-gray-600">
                      {val.artifact_title || val.file_path || 'N/A'}
                    </div>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded ${
                      val.status === 'PASS'
                        ? 'bg-green-100 text-green-800'
                        : val.status === 'REVIEW'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {val.status}
                  </span>
                </div>
                {val.score !== null && (
                  <div className="text-xs text-gray-500 mt-1">Score: {val.score}</div>
                )}
                <div className="text-xs text-gray-400 mt-1">
                  {new Date(val.validated_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ArtifactSection({ artifactStats }: { artifactStats: ArtifactStats[] | null }) {
  if (!artifactStats || artifactStats.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-bold mb-4">Artifact Statistics</h3>
        <p className="text-gray-500">No artifact data available</p>
      </div>
    );
  }

  // Prepare chart data by artifact type
  const typeData = artifactStats.reduce((acc, item) => {
    if (!acc[item.artifact_type]) {
      acc[item.artifact_type] = 0;
    }
    acc[item.artifact_type] += item.count;
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.entries(typeData).map(([name, value]) => ({
    name,
    value,
  }));

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-bold mb-4">Artifact Statistics</h3>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <div>
          <h4 className="font-semibold mb-2">Artifacts by Type</h4>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={(entry) => `${entry.name}: ${entry.value}`}
              >
                {chartData.map((_entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'][index % 6]}
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Artifact Table */}
        <div>
          <h4 className="font-semibold mb-2">Breakdown by Phase</h4>
          <div className="max-h-[250px] overflow-y-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Type</th>
                  <th className="px-3 py-2 text-left font-semibold">Phase</th>
                  <th className="px-3 py-2 text-right font-semibold">Count</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {artifactStats.map((stat, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-3 py-2">{stat.artifact_type}</td>
                    <td className="px-3 py-2">{stat.phase}</td>
                    <td className="px-3 py-2 text-right font-medium">{stat.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
