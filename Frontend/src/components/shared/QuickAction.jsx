// src/components/shared/QuickAction.jsx
import React, { memo } from 'react';
import { Link } from 'react-router-dom';

const QuickAction = memo(({ icon: Icon, label, path, color }) => {
  return (
    <Link
      to={path}
      className="flex flex-col items-center p-4 bg-white rounded-lg border border-gray-200 hover:border-cyan-300 hover:shadow-md transition-all duration-200 group"
    >
      <div className={`p-3 rounded-full ${color} mb-3 group-hover:scale-110 transition-transform`}>
        <Icon className="h-6 w-6 text-white" />
      </div>
      <span className="text-sm font-medium text-gray-700 text-center">{label}</span>
    </Link>
  );
});

QuickAction.displayName = 'QuickAction';

export default QuickAction;