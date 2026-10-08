const fs = require('fs');
const path = 'd:/DEMO/demo uchun/frontend/src/components/ProductHistoryDrawer.jsx';
let content = fs.readFileSync(path, 'utf8');

// Replace the history item layout
const targetStart = '<div className="p-4 flex items-start gap-4">';
const targetEnd = '{isExpanded && (';
const newLayout = `<div className="p-4 flex items-center gap-3 sm:gap-4">
                      <div className={\`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border \${statusColor} bg-opacity-20\`}>
                        {icon}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={\`text-12 sm:text-13 font-[700] uppercase tracking-wider \${titleColor}\`}>{item.type}</span>
                          <span className="text-11 sm:text-12 font-mono text-tertiary">#{item.number}</span>
                          {item.status && (
                            <span className={\`hidden sm:inline-flex px-1.5 py-0.5 rounded text-[10px] font-[700] uppercase tracking-wider border \${statusColor}\`}>
                              {item.status === 'confirmed' ? 'Tasdiqlangan' : item.status}
                            </span>
                          )}
                        </div>
                        
                        <div className="text-12 sm:text-13 font-[500] text-secondary flex items-center gap-1.5 truncate">
                          <span>{new Date(item.date).toISOString().replace('T', ' ').substring(0, 16)}</span>
                          <span className="text-tertiary">•</span>
                          <span className="truncate">{item.type === 'SOTUV' || item.type === 'VOZVRAT' ? item.customer?.name : item.to?.name}</span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-14 sm:text-15 font-[700] text-primary tabular-nums">{sign}{item.quantity} {item.unit}</span>
                        {item.type === 'SOTUV' && (
                          <span className="text-12 sm:text-13 font-[700] text-emerald-600 tabular-nums">{formatMoney(item.revenue)}</span>
                        )}
                        {item.type === 'VOZVRAT' && item.refundAmount > 0 && (
                          <span className="text-12 sm:text-13 font-[700] text-rose-600 tabular-nums">{formatMoney(item.refundAmount)}</span>
                        )}
                      </div>

                      <div className="text-tertiary shrink-0 ml-1 sm:ml-2">
                        {isExpanded ? <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5" /> : <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5" />}
                      </div>
                    </div>
                    
                    `;

const startIndex = content.indexOf(targetStart);
const endIndex = content.indexOf(targetEnd);

if (startIndex !== -1 && endIndex !== -1) {
  content = content.substring(0, startIndex) + newLayout + content.substring(endIndex);
  fs.writeFileSync(path, content, 'utf8');
  console.log('Fixed item layout');
} else {
  console.log('Not found');
}
