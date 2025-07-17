import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const logType = searchParams.get('type') || 'error'; // Default to 'error' log

    const logFilePath = path.join(process.cwd(), 'logs', `${logType}.log`);
    const logContent = await fs.readFile(logFilePath, 'utf-8');

    return NextResponse.json({ content: logContent.split('\n').filter(line => line.trim()) });
  } catch (error) {
    console.error(`Error reading log file: ${error}`);
    return NextResponse.json({ message: 'Failed to load log file' }, { status: 500 });
  }
}