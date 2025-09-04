import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const validLogTypes = ['error', 'info', 'combined', 'exceptions', 'rejections'];

// Ensure logs directory exists
async function ensureLogsDirectory() {
  const logDir = path.join(process.cwd(), 'logs');
  try {
    await fs.access(logDir);
  } catch {
    await fs.mkdir(logDir, { recursive: true });
  }
  return logDir;
}

// Parse log line to JSON if possible
function parseLogLine(line: string) {
  try {
    return JSON.parse(line);
  } catch {
    return {
      raw: line,
      message: line,
      level: 'unknown',
      timestamp: new Date().toISOString()
    };
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const logType = searchParams.get('type') || 'error';
    const returnRaw = searchParams.get('raw') === 'true';

    if (!validLogTypes.includes(logType)) {
      return NextResponse.json({ message: 'Invalid log type' }, { status: 400 });
    }

    const logDir = await ensureLogsDirectory();

    if (logType === 'combined') {
      const logFiles = ['error.log', 'info.log', 'exceptions.log', 'rejections.log'];
      const allLogs: any[] = [];
      let rawContent = '';

      for (const file of logFiles) {
        const filePath = path.join(logDir, file);
        try {
          await fs.access(filePath);
          const content = await fs.readFile(filePath, 'utf-8');
          
          if (returnRaw) {
            rawContent += `\n--- ${file} ---\n${content}`;
          } else {
            const lines = content.split('\n').filter(line => line.trim());
            const parsedLogs = lines.map(line => {
              const parsed = parseLogLine(line);
              return {
                ...parsed,
                source: file.replace('.log', '')
              };
            });
            allLogs.push(...parsedLogs);
          }
        } catch {
          console.warn(`Log file not found: ${file}`);
        }
      }

      if (returnRaw) {
        return NextResponse.json({ raw: rawContent.trim() });
      }

      allLogs.sort((a, b) => {
        const timeA = new Date(a.timestamp || 0).getTime();
        const timeB = new Date(b.timestamp || 0).getTime();
        return timeB - timeA;
      });

      return NextResponse.json(allLogs);
    }

    const logFilePath = path.join(logDir, `${logType}.log`);

    try {
      await fs.access(logFilePath);
    } catch {
      return NextResponse.json(returnRaw ? { raw: '' } : []);
    }

    const logContent = await fs.readFile(logFilePath, 'utf-8');

    if (returnRaw) {
      return NextResponse.json({ raw: logContent });
    }

    const lines = logContent.split('\n').filter(line => line.trim());
    const parsedLogs = lines.map(parseLogLine);

    parsedLogs.sort((a, b) => {
      const timeA = new Date(a.timestamp || 0).getTime();
      const timeB = new Date(b.timestamp || 0).getTime();
      return timeB - timeA;
    });

    return NextResponse.json(parsedLogs);

  } catch (error) {
    console.error(`Error reading log file: ${error}`);
    return NextResponse.json({ message: 'Failed to load log file' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const logType = searchParams.get('type') || 'error';
    const index = parseInt(searchParams.get('index') || '-1', 10);
    const clearAll = searchParams.get('clearAll') === 'true';

    const logDir = await ensureLogsDirectory();

    // Clear specific log type only
    if (clearAll) {
      if (!validLogTypes.includes(logType)) {
        return NextResponse.json({ message: 'Invalid log type' }, { status: 400 });
      }

      const logFilePath = path.join(logDir, `${logType}.log`);
      
      try {
        await fs.access(logFilePath);
        await fs.writeFile(logFilePath, '', 'utf-8');
        return NextResponse.json({ message: `${logType.toUpperCase()} logs cleared successfully` });
      } catch {
        return NextResponse.json({ message: `${logType.toUpperCase()} log file not found or already empty` });
      }
    }

    // Delete single log entry (existing functionality)
    if (!validLogTypes.includes(logType) || index < 0) {
      return NextResponse.json({ message: 'Invalid log type or index' }, { status: 400 });
    }

    const logFilePath = path.join(logDir, `${logType}.log`);

    try {
      await fs.access(logFilePath);
      const content = await fs.readFile(logFilePath, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim());

      if (index >= lines.length) {
        return NextResponse.json({ message: 'Index out of range' }, { status: 400 });
      }

      lines.splice(index, 1);
      await fs.writeFile(logFilePath, lines.join('\n') + (lines.length ? '\n' : ''), 'utf-8');

      return NextResponse.json({ message: 'Log entry deleted successfully' });
    } catch {
      return NextResponse.json({ message: 'Log file not found' }, { status: 404 });
    }

  } catch (error) {
    console.error('Error deleting log:', error);
    return NextResponse.json({ message: 'Failed to delete log' }, { status: 500 });
  }
}


export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const logType = searchParams.get('type') || 'error';

    if (!validLogTypes.includes(logType)) {
      return NextResponse.json({ message: 'Invalid log type' }, { status: 400 });
    }

    const logDir = await ensureLogsDirectory();
    const logFilePath = path.join(logDir, `${logType}.log`);

    try {
      await fs.access(logFilePath);
      const content = await fs.readFile(logFilePath, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim());

      const formattedLines = lines.map(line => {
        try {
          const parsed = JSON.parse(line);
          return JSON.stringify(parsed, null, 2);
        } catch {
          return line;
        }
      });

      await fs.writeFile(
        logFilePath, 
        formattedLines.join('\n') + (formattedLines.length ? '\n' : ''), 
        'utf-8'
      );

      return NextResponse.json({ message: 'Logs formatted successfully' });
    } catch {
      return NextResponse.json({ message: 'Log file not found or no logs to format' }, { status: 404 });
    }

  } catch (error) {
    console.error('Error formatting logs:', error);
    return NextResponse.json({ message: 'Failed to format logs' }, { status: 500 });
  }
}
