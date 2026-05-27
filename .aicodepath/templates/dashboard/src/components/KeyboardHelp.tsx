interface Shortcut {
    key: string;
    description: string;
    category: 'navigation' | 'action' | 'modal' | 'productivity';
}

const shortcuts: Shortcut[] = [
    { key: 'M', description: 'Monitor View', category: 'navigation' },
    { key: 'A', description: 'Agents View', category: 'navigation' },
    { key: 'K', description: 'Kanban Board', category: 'navigation' },
    { key: 'G', description: 'Dependency Graph', category: 'navigation' },
    { key: 'V', description: 'Visual Memory', category: 'navigation' },
    { key: 'Shift+A', description: 'Toggle AI Assistant', category: 'productivity' },
    { key: 'Shift+N', description: 'Add New Feature', category: 'productivity' },
    { key: 'E', description: 'Expand Project (AI)', category: 'productivity' },
    { key: 'D', description: 'Toggle Debug Panel', category: 'action' },
    { key: '?', description: 'Show This Help', category: 'modal' },
    { key: 'Esc', description: 'Close Modal', category: 'modal' },
];

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

export function KeyboardHelp({ isOpen, onClose }: Props) {
    if (!isOpen) return null;

    const categories = {
        navigation: 'Navigation',
        productivity: 'Productivity',
        action: 'Actions',
        modal: 'Modals',
    };

    return (
        <div
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-lg w-full mx-4 shadow-xl"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Keyboard Shortcuts
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {Object.entries(categories).map(([cat, label]) => (
                    <div key={cat} className="mb-4">
                        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                            {label}
                        </h3>
                        <div className="space-y-2">
                            {shortcuts
                                .filter(s => s.category === cat)
                                .map(({ key, description }) => (
                                    <div key={key} className="flex items-center justify-between py-1">
                                        <span className="text-gray-700 dark:text-gray-300">{description}</span>
                                        <kbd className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded font-mono text-sm font-medium text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-600">
                                            {key}
                                        </kbd>
                                    </div>
                                ))}
                        </div>
                    </div>
                ))}

                <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Press <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">?</kbd> anytime to show this help
                    </p>
                </div>
            </div>
        </div>
    );
}
