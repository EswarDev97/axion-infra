import { useEffect, useRef, useState, useCallback } from 'react';
import { TransformWrapper, TransformComponent, ReactZoomPanPinchRef } from 'react-zoom-pan-pinch';
import { motion, AnimatePresence } from 'framer-motion';
import mermaid from 'mermaid';
import { ZoomControls } from './ZoomControls';

interface DiagramViewerProps {
  mermaidContent: string;
  diagramId: number;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  diagramTitle?: string;
}

export function DiagramViewer({
  mermaidContent,
  diagramId,
  isFullscreen,
  onToggleFullscreen,
  diagramTitle
}: DiagramViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mermaidRef = useRef<HTMLDivElement>(null);
  const transformRef = useRef<ReactZoomPanPinchRef | null>(null);
  const [rendering, setRendering] = useState(true);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [svgReady, setSvgReady] = useState(false);

  // Make SVG responsive after Mermaid renders it
  const makeSvgResponsive = useCallback(() => {
    if (!mermaidRef.current) return;
    const svg = mermaidRef.current.querySelector('svg');
    if (!svg) return;

    const w = svg.getAttribute('width');
    const h = svg.getAttribute('height');
    const wNum = parseFloat(w || '0');
    const hNum = parseFloat(h || '0');

    if (wNum > 0 && hNum > 0) {
      if (!svg.getAttribute('viewBox')) {
        svg.setAttribute('viewBox', `0 0 ${wNum} ${hNum}`);
      }
      // Keep explicit pixel dimensions so react-zoom-pan-pinch can scale properly.
      // Setting width:100% inside a fit-content container causes circular sizing.
      svg.setAttribute('width', String(wNum));
      svg.setAttribute('height', String(hNum));
      svg.style.display = 'block';
    }
  }, []);

  // Auto-fit diagram to container
  // minScale: 0 = fit whole diagram (for Fit button), >0 = floor for readable initial view
  const fitToScreen = useCallback((minScale = 0) => {
    if (!transformRef.current || !mermaidRef.current || !containerRef.current) return;

    const svg = mermaidRef.current.querySelector('svg');
    if (!svg) return;

    const viewBox = svg.getAttribute('viewBox');
    if (!viewBox) {
      transformRef.current.resetTransform();
      return;
    }

    const [, , svgW, svgH] = viewBox.split(' ').map(Number);
    const container = containerRef.current.getBoundingClientRect();

    const scaleX = (container.width - 48) / svgW;
    const scaleY = (container.height - 48) / svgH;
    const naturalScale = Math.min(scaleX, scaleY, 2); // cap at 2x
    const scale = minScale > 0 ? Math.max(naturalScale, minScale) : naturalScale;

    // If diagram fits at this scale, center it; otherwise show top-left portion
    const fitsInView = scale <= naturalScale + 0.001;
    const posX = fitsInView ? (container.width - svgW * scale) / 2 : 24;
    const posY = fitsInView ? (container.height - svgH * scale) / 2 : 24;

    transformRef.current.setTransform(posX, posY, scale);
  }, []);

  // Download diagram as PNG
  const downloadAsPng = useCallback(async () => {
    if (!mermaidRef.current) return;
    const svg = mermaidRef.current.querySelector('svg');
    if (!svg) return;

    const svgClone = svg.cloneNode(true) as SVGSVGElement;
    const viewBox = svgClone.getAttribute('viewBox');
    let w = 1920, h = 1080;
    if (viewBox) {
      const parts = viewBox.split(' ').map(Number);
      w = parts[2] || 1920;
      h = parts[3] || 1080;
    }

    // Scale up for high-res export
    const scaleFactor = 2;
    svgClone.setAttribute('width', String(w * scaleFactor));
    svgClone.setAttribute('height', String(h * scaleFactor));

    // Replace <foreignObject> with <text> to prevent canvas tainting.
    // Browsers block toBlob() when foreignObject (HTML inside SVG) is drawn on canvas.
    const foreignObjects = Array.from(svgClone.querySelectorAll('foreignObject'));
    for (const fo of foreignObjects) {
      const textContent = fo.textContent?.trim() || '';
      if (textContent) {
        const textEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        const x = parseFloat(fo.getAttribute('x') || '0');
        const y = parseFloat(fo.getAttribute('y') || '0');
        const foW = parseFloat(fo.getAttribute('width') || '100');
        const foH = parseFloat(fo.getAttribute('height') || '20');
        textEl.setAttribute('x', String(x + foW / 2));
        textEl.setAttribute('y', String(y + foH / 2));
        textEl.setAttribute('text-anchor', 'middle');
        textEl.setAttribute('dominant-baseline', 'middle');
        textEl.setAttribute('fill', '#e5e7eb');
        textEl.setAttribute('font-family', "'Trebuchet MS', sans-serif");
        textEl.setAttribute('font-size', '14');
        textEl.textContent = textContent;
        fo.parentNode?.replaceChild(textEl, fo);
      } else {
        fo.remove();
      }
    }

    // Inject computed styles for SVG elements
    const styleEl = document.createElement('style');
    styleEl.textContent = `
      * { font-family: 'Trebuchet MS', 'Lucida Grande', 'Lucida Sans Unicode', sans-serif; }
      .node rect, .node circle, .node polygon, .node path { stroke: #60a5fa; fill: #1f2937; }
      .edgePath .path { stroke: #6366f1; }
      .label { color: #e5e7eb; fill: #e5e7eb; }
      text { fill: #e5e7eb; }
      .er.entityBox { fill: #1f2937; stroke: #60a5fa; }
      .er.attributeBoxOdd, .er.attributeBoxEven { fill: #111827; stroke: #374151; }
      .er.relationshipLine { stroke: #6366f1; }
      line { stroke: #374151; }
    `;
    svgClone.insertBefore(styleEl, svgClone.firstChild);

    // Set background
    const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bgRect.setAttribute('width', '100%');
    bgRect.setAttribute('height', '100%');
    bgRect.setAttribute('fill', '#0f172a');
    svgClone.insertBefore(bgRect, svgClone.firstChild);

    // Use data URL instead of blob URL to avoid canvas tainting
    const svgData = new XMLSerializer().serializeToString(svgClone);
    const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgData)}`;

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = w * scaleFactor;
      canvas.height = h * scaleFactor;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      canvas.toBlob((blob) => {
        if (!blob) return;
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${diagramTitle || 'diagram'}-${diagramId}.png`;
        a.click();
        URL.revokeObjectURL(a.href);
      }, 'image/png');
    };
    img.src = url;
  }, [diagramId, diagramTitle]);

  useEffect(() => {
    const renderDiagram = async () => {
      if (!mermaidRef.current) return;

      try {
        setRendering(true);
        setRenderError(null);
        setSvgReady(false);

        // Validate mermaidContent is a non-empty string
        if (!mermaidContent) {
          console.error('[DiagramViewer] mermaidContent is null/undefined:', {
            diagramId,
            type: typeof mermaidContent,
            value: mermaidContent
          });
          setRenderError('Diagram content is missing (null or undefined)');
          setRendering(false);
          return;
        }

        if (typeof mermaidContent !== 'string') {
          console.error('[DiagramViewer] mermaidContent is not a string:', {
            diagramId,
            type: typeof mermaidContent,
            value: mermaidContent
          });
          setRenderError(
            `Invalid diagram content type: expected string, got ${typeof mermaidContent}`
          );
          setRendering(false);
          return;
        }

        if (mermaidContent.trim().length === 0) {
          console.error('[DiagramViewer] mermaidContent is empty:', { diagramId });
          setRenderError('Diagram content is empty');
          setRendering(false);
          return;
        }

        // Now safe to render
        const id = `mermaid-${diagramId}-${Date.now()}`;
        const { svg } = await mermaid.render(id, mermaidContent);

        if (mermaidRef.current) {
          mermaidRef.current.innerHTML = svg;
          makeSvgResponsive();
          setSvgReady(true);
        }
      } catch (error) {
        console.error('Mermaid rendering error:', error);
        setRenderError(error instanceof Error ? error.message : 'Failed to render diagram');
      } finally {
        setRendering(false);
      }
    };

    renderDiagram();
  }, [mermaidContent, diagramId, makeSvgResponsive]);

  // Auto-fit when SVG is ready or fullscreen changes
  useEffect(() => {
    if (svgReady && transformRef.current) {
      const timer = setTimeout(() => {
        if (isFullscreen) {
          // In fullscreen, zoom to 100% (1:1)
          transformRef.current?.setTransform(0, 0, 1);
        } else {
          // Normal mode: 40% minimum for readable initial view
          fitToScreen(0.4);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [svgReady, isFullscreen, fitToScreen]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!transformRef.current) return;

      if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '=')) {
        e.preventDefault();
        transformRef.current.zoomIn(0.3);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '-') {
        e.preventDefault();
        transformRef.current.zoomOut(0.3);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault();
        transformRef.current.resetTransform();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        fitToScreen(0);
      }
      if (e.key === 'Escape' && isFullscreen) {
        onToggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, onToggleFullscreen, fitToScreen]);

  const handleZoomChange = (ref: ReactZoomPanPinchRef) => {
    setZoom(ref.state.scale);
  };

  return (
    <div
      ref={containerRef}
      className={`relative ${isFullscreen ? 'fixed inset-0 z-[60] bg-slate-950' : 'w-full h-full'}`}
    >
      {/* Fullscreen Toggle */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onToggleFullscreen}
        className="absolute top-4 right-4 z-10 w-12 h-12 rounded-xl bg-slate-800/90 backdrop-blur-sm hover:bg-slate-700 text-white flex items-center justify-center transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40"
        title={isFullscreen ? 'Exit Fullscreen (ESC)' : 'Enter Fullscreen'}
      >
        {isFullscreen ? (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        )}
      </motion.button>

      {/* Pan/Zoom Container */}
      <TransformWrapper
        ref={transformRef}
        initialScale={1}
        minScale={0.1}
        maxScale={8}
        centerOnInit={false}
        wheel={{ step: 0.15 }}
        doubleClick={{ mode: 'zoomIn', step: 0.7 }}
        onTransformed={handleZoomChange}
        onPanningStart={() => setIsPanning(true)}
        onPanningStop={() => setIsPanning(false)}
      >
        {({ zoomIn, zoomOut, resetTransform }) => (
          <>
            <TransformComponent
              wrapperStyle={{ 
                width: '100%', 
                height: isFullscreen ? '100vh' : '100%', 
                overflow: 'hidden' 
              }}
              contentStyle={{ width: 'fit-content', height: 'fit-content' }}
            >
              {rendering && (
                <div className="flex items-center justify-center" style={{ width: '100%', minHeight: 400 }}>
                  <div className="text-center">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full mx-auto mb-4"
                    />
                    <p className="text-slate-400 text-sm font-light tracking-wide">Rendering diagram...</p>
                  </div>
                </div>
              )}

              {renderError && (
                <div className="flex items-center justify-center" style={{ width: '100%', minHeight: 400 }}>
                  <div className="text-center max-w-md">
                    <div className="text-6xl mb-4">⚠️</div>
                    <p className="text-red-400 font-medium text-lg mb-2">Rendering Error</p>
                    <p className="text-slate-500 text-sm leading-relaxed">{renderError}</p>
                    <p className="text-slate-600 text-xs mt-4">Check browser console for details</p>
                  </div>
                </div>
              )}

              <div
                ref={mermaidRef}
                className="diagram-content"
                style={{
                  display: rendering || renderError ? 'none' : 'block',
                  padding: '24px',
                }}
              />
            </TransformComponent>

            {/* Zoom Controls */}
            {!rendering && !renderError && (
              <ZoomControls
                zoom={zoom}
                onZoomIn={() => zoomIn(0.3)}
                onZoomOut={() => zoomOut(0.3)}
                onReset={() => resetTransform()}
                onFitToScreen={() => fitToScreen(0)}
                onDownloadPng={downloadAsPng}
                minZoom={0.1}
                maxZoom={8}
              />
            )}
          </>
        )}
      </TransformWrapper>

      {/* Panning Indicator */}
      <AnimatePresence>
        {isPanning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed top-4 left-4 z-10 bg-blue-500/20 backdrop-blur-sm border border-blue-500/40 rounded-xl px-4 py-2 text-blue-300 text-sm font-medium"
          >
            Panning...
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
