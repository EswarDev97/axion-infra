import { motion } from 'framer-motion';

interface ZoomControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onFitToScreen: () => void;
  onDownloadPng?: () => void;
  minZoom?: number;
  maxZoom?: number;
}

export function ZoomControls({
  zoom,
  onZoomIn,
  onZoomOut,
  onReset,
  onFitToScreen,
  onDownloadPng,
  minZoom = 0.1,
  maxZoom = 8
}: ZoomControlsProps) {
  const zoomPercentage = Math.round(zoom * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50"
    >
      <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-2xl px-4 py-3 shadow-2xl shadow-blue-500/20">
        <div className="flex items-center gap-2">
          {/* Zoom Out */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onZoomOut}
            disabled={zoom <= minZoom}
            className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xl flex items-center justify-center transition-all hover:shadow-lg hover:shadow-blue-500/20"
            title="Zoom Out (Ctrl + -)"
          >
            −
          </motion.button>

          {/* Zoom Percentage */}
          <div className="px-3 py-2 min-w-[72px] text-center">
            <div className="text-white font-bold text-base tabular-nums">{zoomPercentage}%</div>
            <div className="text-[10px] text-slate-500">Zoom</div>
          </div>

          {/* Zoom In */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onZoomIn}
            disabled={zoom >= maxZoom}
            className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xl flex items-center justify-center transition-all hover:shadow-lg hover:shadow-blue-500/20"
            title="Zoom In (Ctrl + +)"
          >
            +
          </motion.button>

          <div className="w-px h-8 bg-slate-700/50 mx-1" />

          {/* Reset (1:1) */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onReset}
            className="px-3 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium flex items-center gap-1.5 transition-all hover:shadow-lg hover:shadow-blue-500/20"
            title="Reset Zoom (Ctrl + 0)"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            1:1
          </motion.button>

          {/* Fit to Screen */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onFitToScreen}
            className="px-3 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium flex items-center gap-1.5 transition-all hover:shadow-lg hover:shadow-blue-500/20"
            title="Fit to Screen (Ctrl + F)"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
            Fit
          </motion.button>

          {/* Download PNG */}
          {onDownloadPng && (
            <>
              <div className="w-px h-8 bg-slate-700/50 mx-1" />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onDownloadPng}
                className="px-3 h-10 rounded-xl bg-emerald-600/80 hover:bg-emerald-600 text-white text-sm font-medium flex items-center gap-1.5 transition-all hover:shadow-lg hover:shadow-emerald-500/20"
                title="Download as PNG"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                PNG
              </motion.button>
            </>
          )}
        </div>

        {/* Tips */}
        <div className="mt-2 pt-2 border-t border-slate-700/50 flex items-center gap-3 text-[10px] text-slate-500">
          <span>Scroll to zoom</span>
          <span>•</span>
          <span>Drag to pan</span>
          <span>•</span>
          <span>Double-click to zoom in</span>
        </div>
      </div>
    </motion.div>
  );
}
