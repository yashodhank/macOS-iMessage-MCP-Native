/**
 * Token-Oriented Object Notation (TOON) stringifier.
 * Designed for token efficiency in LLM communications.
 * 
 * Spec: https://toonformat.dev/reference/spec.html (v3.0)
 */

export interface StringifyOptions {
  indentSize?: number;
  delimiter?: string;
  arrayKey?: string;
}

export function stringify(data: any, options: StringifyOptions = {}): string {
  const { indentSize = 2, delimiter = ',', arrayKey = 'items' } = options;

  if (data === null) return 'null';
  if (typeof data === 'undefined') return 'undefined';
  
  if (Array.isArray(data)) {
    if (data.length === 0) return '[]';
    
    // Check if it's an array of objects for tabular format
    const first = data[0];
    if (typeof first === 'object' && first !== null) {
      const keys = Object.keys(first);
      const header = `${arrayKey}[${data.length}]{${keys.join(delimiter)}}`;
      const rows = data.map(item => {
        return keys.map(key => {
          const val = item[key];
          return formatValue(val, delimiter);
        }).join(delimiter);
      });
      
      return `${header}:\n${rows.join('\n')}`;
    }
    
    // Primitive array
    return `[${data.map(val => formatValue(val, delimiter)).join(delimiter)}]`;
  }
  
  if (typeof data === 'object') {
    const lines = Object.entries(data).map(([key, value]) => {
      const valStr = typeof value === 'object' && value !== null 
        ? '\n' + stringify(value, { ...options, arrayKey: key }).split('\n').map(l => ' '.repeat(indentSize) + l).join('\n')
        : formatValue(value, delimiter);
      return `${key}:${valStr}`;
    });
    return lines.join('\n');
  }
  
  return formatValue(data, delimiter);
}

function formatValue(val: any, delimiter: string): string {
  if (val === null) return 'null';
  if (typeof val === 'undefined') return 'undefined';
  if (typeof val === 'boolean' || typeof val === 'number') return String(val);
  
  const str = String(val);
  if (needsQuoting(str, delimiter)) {
    return `"${escapeString(str)}"`;
  }
  return str;
}

function needsQuoting(str: string, delimiter: string): boolean {
  return (
    str.includes(':') ||
    str.includes(delimiter) ||
    str.includes('\n') ||
    str.includes('\r') ||
    str.includes('\t') ||
    str.startsWith(' ') ||
    str.endsWith(' ') ||
    str.includes('"') ||
    str.includes('\\') ||
    /[\[\]{}]/.test(str)
  );
}

function escapeString(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}
