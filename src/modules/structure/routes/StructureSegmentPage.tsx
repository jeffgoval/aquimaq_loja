import { Navigate, useParams } from 'react-router-dom';
import { getStructureConfig } from '../structureConfig';
import { StructureEntityCrud } from '../components/StructureEntityCrud';

export function StructureSegmentPage() {
  const { segment } = useParams<{ segment: string }>();
  const config = getStructureConfig(segment);

  if (!config) {
    return <Navigate to="/structure/result-centers" replace />;
  }

  return <StructureEntityCrud key={config.segment} config={config} />;
}
