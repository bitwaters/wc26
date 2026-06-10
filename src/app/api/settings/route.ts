import { NextResponse } from 'next/server';
import { readSettings, writeSettings, maskApiKey } from '@/lib/storage';
import { requireApiAuth } from '@/lib/apiAuth';

export async function GET(request: Request) {
  const authError = requireApiAuth(request);
  if (authError) return authError;

  try {
    const settings = readSettings();
    return NextResponse.json({
      llmProvider: settings.llmProvider,
      apiKey: '',
      apiKeyPreview: maskApiKey(settings.apiKey),
      hasApiKey: Boolean(settings.apiKey),
      llmModel: settings.llmModel || ''
    });
  } catch (error) {
    console.error('Failed to read settings:', error);
    return NextResponse.json({ error: 'Failed to read settings.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authError = requireApiAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { llmProvider, apiKey, llmModel } = body;

    if (!llmProvider || apiKey === undefined) {
      return NextResponse.json({ error: 'Missing required configuration parameters.' }, { status: 400 });
    }

    const current = readSettings();
    const trimmedKey = typeof apiKey === 'string' ? apiKey.trim() : '';

    const updated = {
      llmProvider,
      apiKey: trimmedKey || current.apiKey,
      llmModel: typeof llmModel === 'string' ? llmModel.trim() : (current.llmModel || '')
    };

    writeSettings(updated);

    return NextResponse.json({
      success: true,
      settings: {
        llmProvider: updated.llmProvider,
        apiKey: '',
        apiKeyPreview: maskApiKey(updated.apiKey),
        hasApiKey: Boolean(updated.apiKey),
        llmModel: updated.llmModel
      }
    });
  } catch (error) {
    console.error('Failed to save settings:', error);
    return NextResponse.json({ error: 'Failed to save settings.' }, { status: 500 });
  }
}
