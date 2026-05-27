import { useDatabase } from '../hooks/useDatabase';

interface WorkflowTask {
  id: number;
  cr_number: string | null;
  phase: string;
  stage: string;
  unit: string | null;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  steps_total: number;
  steps_completed: number;
  artifacts_created: string | null;
  notes: string | null;
  blockers: string | null;
}

const statusColumns = {
  pending: { title: 'Pending', color: 'border-gray-400 bg-gray-50' },
  in_progress: { title: 'In Progress', color: 'border-blue-400 bg-blue-50' },
  completed: { title: 'Completed', color: 'border-green-400 bg-green-50' },
  blocked: { title: 'Blocked', color: 'border-red-400 bg-red-50' },
  skipped: { title: 'Skipped', color: 'border-yellow-400 bg-yellow-50' },
};

export function KanbanBoard() {
  const { data: tasks, loading, error } = useDatabase<WorkflowTask[]>('/workflow-state');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-600">Loading workflow state...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-50 border border-red-200 rounded p-4 text-red-700">
          Error loading workflow state: {error.message}
        </div>
      </div>
    );
  }

  if (!tasks || tasks.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="text-gray-500 text-lg">No workflow tasks found</div>
        <p className="text-gray-400 text-sm mt-2">
          Workflow tasks will appear here as they are created
        </p>
      </div>
    );
  }

  // Group tasks by status
  const tasksByStatus: Record<string, WorkflowTask[]> = {};
  Object.keys(statusColumns).forEach(status => {
    tasksByStatus[status] = tasks.filter(t => t.status === status);
  });

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Workflow Board</h2>
        <p className="text-gray-600 mt-1">
          {tasks.length} total tasks across all stages
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {Object.entries(statusColumns).map(([status, config]) => (
          <div key={status} className="flex flex-col">
            <div className={`${config.color} border-2 rounded-t-lg px-4 py-3`}>
              <h3 className="font-bold text-gray-900">
                {config.title}
                <span className="ml-2 text-sm font-normal text-gray-600">
                  ({tasksByStatus[status]?.length || 0})
                </span>
              </h3>
            </div>

            <div className="bg-gray-100 rounded-b-lg p-2 space-y-2 min-h-[200px]">
              {tasksByStatus[status]?.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TaskCard({ task }: { task: WorkflowTask }) {
  const progressPercentage = task.steps_total > 0
    ? Math.round((task.steps_completed / task.steps_total) * 100)
    : 0;

  return (
    <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
      <div className="space-y-2">
        {/* Header */}
        <div>
          {task.cr_number && (
            <div className="text-xs font-mono text-gray-500 mb-1">
              CR-{task.cr_number}
            </div>
          )}
          <div className="font-semibold text-sm text-gray-900">
            {task.unit || task.stage}
          </div>
        </div>

        {/* Phase & Stage */}
        <div className="flex flex-wrap gap-1">
          <span className="inline-block px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-800 rounded">
            {task.phase}
          </span>
          <span className="inline-block px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded">
            {task.stage}
          </span>
        </div>

        {/* Progress */}
        {task.steps_total > 0 && (
          <div>
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>Progress</span>
              <span>{progressPercentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {task.steps_completed} / {task.steps_total} steps
            </div>
          </div>
        )}

        {/* Blockers */}
        {task.blockers && (
          <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
            <strong>Blocked:</strong> {task.blockers}
          </div>
        )}

        {/* Notes */}
        {task.notes && (
          <div className="text-xs text-gray-600 italic">
            {task.notes}
          </div>
        )}

        {/* Timestamps */}
        <div className="text-xs text-gray-400 space-y-0.5">
          {task.started_at && (
            <div>Started: {new Date(task.started_at).toLocaleString()}</div>
          )}
          {task.completed_at && (
            <div>Completed: {new Date(task.completed_at).toLocaleString()}</div>
          )}
        </div>
      </div>
    </div>
  );
}
