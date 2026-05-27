import { useDatabase } from '../hooks/useDatabase';
import { useState } from 'react';

interface CodeEntity {
  id: number;
  file_path: string;
  entity_type: string;
  entity_name: string;
  start_line: number;
  end_line: number;
  complexity_score: number | null;
  docstring: string | null;
}

interface CodeRelation {
  id: number;
  source_entity_id: number;
  target_entity_id: number;
  relation_type: string;
  source_name: string | null;
  source_file: string | null;
  target_name: string | null;
  target_file: string | null;
}

export function DependencyGraph() {
  const { data: entities } = useDatabase<CodeEntity[]>('/code-entities');
  const { data: relations } = useDatabase<CodeRelation[]>('/code-relations');
  const [selectedEntity, setSelectedEntity] = useState<CodeEntity | null>(null);
  const [filterType, setFilterType] = useState<string>('all');

  if (!entities && !relations) {
    return (
      <div className="p-8 text-center">
        <div className="text-gray-500 text-lg">Loading dependencies...</div>
      </div>
    );
  }

  if ((!entities || entities.length === 0) && (!relations || relations.length === 0)) {
    return (
      <div className="p-8 text-center">
        <div className="text-gray-500 text-lg">No dependencies tracked yet</div>
        <p className="text-gray-400 text-sm mt-2">
          Code entities and relations will appear here once the codebase is analyzed
        </p>
      </div>
    );
  }

  // Filter entities by type
  const filteredEntities = entities?.filter(
    e => filterType === 'all' || e.entity_type === filterType
  ) || [];

  // Get unique entity types for filter
  const entityTypes = ['all', ...new Set(entities?.map(e => e.entity_type) || [])];

  // Get relations for selected entity
  const selectedRelations = selectedEntity
    ? relations?.filter(
        r => r.source_entity_id === selectedEntity.id || r.target_entity_id === selectedEntity.id
      ) || []
    : [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Dependency Graph</h2>
        <p className="text-gray-600 mt-1">
          {entities?.length || 0} code entities, {relations?.length || 0} relations
        </p>
      </div>

      {/* Filter */}
      <div className="bg-white p-4 rounded-lg shadow">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Filter by Type
        </label>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="block w-full md:w-64 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        >
          {entityTypes.map(type => (
            <option key={type} value={type}>
              {type === 'all' ? 'All Types' : type}
            </option>
          ))}
        </select>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Entity List */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-bold mb-4">Code Entities</h3>
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {filteredEntities.length === 0 ? (
              <p className="text-gray-500">No entities found for this filter</p>
            ) : (
              filteredEntities.map((entity) => (
                <EntityCard
                  key={entity.id}
                  entity={entity}
                  isSelected={selectedEntity?.id === entity.id}
                  onClick={() => setSelectedEntity(entity)}
                />
              ))
            )}
          </div>
        </div>

        {/* Relations & Details */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-bold mb-4">
            {selectedEntity ? 'Entity Details & Relations' : 'Relations Overview'}
          </h3>

          {selectedEntity ? (
            <div className="space-y-4">
              {/* Entity Details */}
              <div className="border-l-4 border-purple-500 pl-4 py-2 bg-purple-50">
                <div className="font-semibold text-lg">{selectedEntity.entity_name}</div>
                <div className="text-sm text-gray-600 font-mono mt-1">
                  {selectedEntity.file_path}
                </div>
                <div className="flex gap-3 mt-2 text-sm">
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                    {selectedEntity.entity_type}
                  </span>
                  <span className="text-gray-600">
                    Lines {selectedEntity.start_line}-{selectedEntity.end_line}
                  </span>
                  {selectedEntity.complexity_score !== null && (
                    <span className="text-gray-600">
                      Complexity: {selectedEntity.complexity_score.toFixed(2)}
                    </span>
                  )}
                </div>
                {selectedEntity.docstring && (
                  <div className="mt-2 text-sm text-gray-700 bg-white p-2 rounded">
                    {selectedEntity.docstring}
                  </div>
                )}
              </div>

              {/* Relations */}
              <div>
                <h4 className="font-semibold mb-2">
                  Relations ({selectedRelations.length})
                </h4>
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {selectedRelations.length === 0 ? (
                    <p className="text-gray-500 text-sm">No relations found</p>
                  ) : (
                    selectedRelations.map((relation) => (
                      <RelationCard
                        key={relation.id}
                        relation={relation}
                        currentEntityId={selectedEntity.id}
                      />
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {relations && relations.length > 0 ? (
                <div>
                  <p className="text-gray-600 mb-4">
                    Click on an entity to view its details and relations
                  </p>
                  <div className="space-y-2">
                    {relations.slice(0, 20).map((relation) => (
                      <RelationCard key={relation.id} relation={relation} />
                    ))}
                  </div>
                  {relations.length > 20 && (
                    <p className="text-sm text-gray-500 mt-4 text-center">
                      Showing 20 of {relations.length} relations
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-gray-500">No relations found</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Relation Type Summary */}
      {relations && relations.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-bold mb-4">Relation Type Summary</h3>
          <RelationTypeSummary relations={relations} />
        </div>
      )}
    </div>
  );
}

function EntityCard({
  entity,
  isSelected,
  onClick,
}: {
  entity: CodeEntity;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`border-l-4 pl-3 py-2 cursor-pointer transition-all ${
        isSelected
          ? 'border-purple-500 bg-purple-50'
          : 'border-gray-300 bg-white hover:bg-gray-50'
      }`}
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="font-semibold text-sm">{entity.entity_name}</div>
          <div className="text-xs text-gray-600 font-mono mt-1">
            {entity.file_path}
          </div>
        </div>
        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
          {entity.entity_type}
        </span>
      </div>
      {entity.complexity_score !== null && entity.complexity_score > 5 && (
        <div className="text-xs text-orange-600 mt-1">
          High complexity: {entity.complexity_score.toFixed(2)}
        </div>
      )}
    </div>
  );
}

function RelationCard({
  relation,
  currentEntityId,
}: {
  relation: CodeRelation;
  currentEntityId?: number;
}) {
  const isOutgoing = currentEntityId === relation.source_entity_id;
  const isIncoming = currentEntityId === relation.target_entity_id;

  return (
    <div className="border rounded p-3 bg-gray-50">
      <div className="flex items-center gap-2 text-sm">
        <div
          className={`flex-1 font-mono text-xs ${
            isOutgoing ? 'font-bold text-blue-700' : 'text-gray-700'
          }`}
        >
          {relation.source_name || 'Unknown'}
          <div className="text-gray-500 text-xs mt-0.5">{relation.source_file}</div>
        </div>

        <div className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-medium">
          {relation.relation_type}
        </div>

        <div
          className={`flex-1 font-mono text-xs text-right ${
            isIncoming ? 'font-bold text-blue-700' : 'text-gray-700'
          }`}
        >
          {relation.target_name || 'Unknown'}
          <div className="text-gray-500 text-xs mt-0.5">{relation.target_file}</div>
        </div>
      </div>
    </div>
  );
}

function RelationTypeSummary({ relations }: { relations: CodeRelation[] }) {
  const typeCounts = relations.reduce((acc, rel) => {
    acc[rel.relation_type] = (acc[rel.relation_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const sortedTypes = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {sortedTypes.map(([type, count]) => (
        <div key={type} className="border rounded p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">{count}</div>
          <div className="text-sm text-gray-600 mt-1">{type}</div>
        </div>
      ))}
    </div>
  );
}
