import { Link } from 'react-router-dom';
import { ArrowRight, ClipboardList } from 'lucide-react';

// Static class map so Tailwind's build-time scanner can see these
// literal strings (dynamic template strings like `lg:grid-cols-${n}`
// would get purged since they don't exist as text in the source).
const LG_COLS_CLASS = {
  1: 'lg:grid-cols-1',
  2: 'lg:grid-cols-2',
  3: 'lg:grid-cols-3',
  4: 'lg:grid-cols-4',
  5: 'lg:grid-cols-5',
};

function WorkspaceCard({ links, title = 'Workspace', subtitle = 'Pick up where you left off' }) {
  // Max 5 per row. The one role with 6 buttons splits evenly into 3 + 3
  // instead of an uneven 5 + 1.
  const effectiveCols = links.length === 6 ? 3 : Math.min(links.length, 5);
  const lgColsClass = LG_COLS_CLASS[effectiveCols] || 'lg:grid-cols-3';

  return (
    <div className="bg-white border border-gov-gray-200 rounded-xl overflow-hidden mb-8">
      <div className="px-6 md:px-8 py-5 bg-gov-gray-50 border-b border-gov-gray-200 flex items-center gap-3">
        <div className="w-9 h-9 rounded-md bg-navy-800/5 flex items-center justify-center text-navy-800">
          <ClipboardList className="w-4.5 h-4.5" />
        </div>
        <div>
          <h3 className="font-semibold text-navy-800 text-base">{title}</h3>
          <p className="text-xs text-gov-gray-500">{subtitle}</p>
        </div>
      </div>

      <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 ${lgColsClass} gap-4 p-6 md:p-8`}>
        {links.map((l) => {
          const Icon = l.icon;
          return (
            <Link
              key={l.to}
              to={l.to}
              className="group bg-gov-gray-50 border border-gov-gray-200 rounded-lg p-5 hover:border-gold hover:bg-white transition-colors no-underline"
            >
              <div className="w-9 h-9 rounded-md bg-white border border-gov-gray-200 flex items-center justify-center text-navy-800 mb-3 group-hover:border-gold transition-colors">
                <Icon className="w-4.5 h-4.5" />
              </div>
              <h4 className="font-semibold text-navy-800 text-sm flex items-center gap-1.5">
                {l.label} <ArrowRight className="w-3.5 h-3.5 text-gov-gray-300 group-hover:text-gold transition-colors" />
              </h4>
              <p className="text-xs text-gov-gray-500 mt-1">{l.desc}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default WorkspaceCard;