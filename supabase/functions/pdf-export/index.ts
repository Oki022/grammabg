import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { text, fileName } = await req.json();
    if (!text) throw new Error('No text provided');

    const ILOVEPDF_PUBLIC_KEY = Deno.env.get('ILOVEPDF_PUBLIC_KEY');
    if (!ILOVEPDF_PUBLIC_KEY) throw new Error('ILOVEPDF_PUBLIC_KEY not set');

    // STEP 1: Auth
    const authRes = await fetch('https://api.ilovepdf.com/v1/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ public_key: ILOVEPDF_PUBLIC_KEY }),
    });
    if (!authRes.ok) {
      const err = await authRes.text();
      throw new Error(`iLovePDF auth failed: ${authRes.status} — ${err}`);
    }
    const { token } = await authRes.json();
    console.log('Auth OK, token:', token?.slice(0, 20) + '...');

    // STEP 2: Start htmlpdf task
    const taskRes = await fetch('https://api.ilovepdf.com/v1/start/htmlpdf', {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!taskRes.ok) {
      const err = await taskRes.text();
      throw new Error(`iLovePDF start failed: ${taskRes.status} — ${err}`);
    }
    const { server, task } = await taskRes.json();
    console.log('Task OK:', { server, task });

    // STEP 3: Build HTML
    const safeFileName = (fileName || 'corrected_document').replace(/\.[^.]+$/, '');
    const htmlContent = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: Arial, Helvetica, sans-serif;
  font-size: 11pt;
  line-height: 1.6;
  color: #000;
  padding: 25mm 20mm;
}
p { margin-bottom: 5pt; }
.empty { margin-bottom: 10pt; }
</style>
</head>
<body>
${text.split('\n').map((line) => {
  const escaped = line.trim()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return escaped
    ? `<p>${escaped}</p>`
    : '<p class="empty">&nbsp;</p>';
}).join('\n')}
</body>
</html>`;

    // STEP 4: Upload — Deno native FormData + Blob
    // Content-Type header'ı MANUEL SET ETME — fetch otomatik boundary ile set eder
    const htmlBlob = new Blob([htmlContent], { type: 'text/html' });
    const formData = new FormData();
    formData.append('task', task);
    formData.append('file', htmlBlob, 'document.html');

    console.log('Uploading to:', `https://${server}/v1/upload`);

    const uploadRes = await fetch(`https://${server}/v1/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    const uploadText = await uploadRes.text();
    console.log('Upload response:', uploadRes.status, uploadText);

    if (!uploadRes.ok) {
      throw new Error(`iLovePDF upload failed: ${uploadRes.status} — ${uploadText}`);
    }
    const { server_filename } = JSON.parse(uploadText);

    // STEP 5: Process
    const processRes = await fetch(`https://${server}/v1/process`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        task,
        tool: 'htmlpdf',
        files: [{ server_filename, filename: 'document.html' }],
        output_filename: safeFileName,
        packaged_filename: safeFileName,
      }),
    });
    if (!processRes.ok) {
      const err = await processRes.text();
      throw new Error(`iLovePDF process failed: ${processRes.status} — ${err}`);
    }
    console.log('Process OK');

    // STEP 6: Download
    const downloadRes = await fetch(`https://${server}/v1/download/${task}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!downloadRes.ok) {
      const err = await downloadRes.text();
      throw new Error(`iLovePDF download failed: ${downloadRes.status} — ${err}`);
    }

    const pdfBuffer = await downloadRes.arrayBuffer();
    const pdfBytes = new Uint8Array(pdfBuffer);
    let pdfBinary = '';
    for (let i = 0; i < pdfBytes.length; i++) {
      pdfBinary += String.fromCharCode(pdfBytes[i]);
    }
    const pdfBase64 = btoa(pdfBinary);
    console.log('PDF ready, size:', pdfBytes.length);

    return new Response(JSON.stringify({
      pdfBase64,
      fileName: `${safeFileName}.pdf`,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('PDF export error:', message);
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
