import { motion, AnimatePresence } from 'framer-motion';

interface ToastProps {
  message: string | null;
  type?: 'success' | 'error' | 'info';
}

export function Toast({ message, type = 'success' }: ToastProps) {
  const colors = {
    success: 'bg-emerald-600',
    error: 'bg-red-600',
    info: 'bg-blue-600'
  };

  const icons = {
    success: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
    error: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
    info: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  };

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.3 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.5 }}
          transition={{ type: "spring", stiffness: 500, damping: 40 }}
          className={`fixed bottom-8 right-8 z-[100] ${colors[type]} text-white px-6 py-4 rounded-2xl shadow-2xl shadow-${type === 'success' ? 'emerald' : type === 'error' ? 'red' : 'blue'}-500/50 flex items-center gap-3`}
        >
          {icons[type]}
          <span className="font-medium text-lg">{message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
