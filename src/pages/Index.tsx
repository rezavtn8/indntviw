import { Helmet } from 'react-helmet-async';
import { IndentViewApp } from '@/components/IndentViewApp';

const Index = () => {
  return (
    <>
      <Helmet>
        <title>IndentView - Nanoindentation Data Visualization</title>
        <meta name="description" content="Professional, science-grade visualization platform for nanoindentation data with interactive 2D heatmaps and 3D point clouds." />
      </Helmet>
      <IndentViewApp />
    </>
  );
};

export default Index;
