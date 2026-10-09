/**
 * Pexels API Verification & Proxy Controller
 */

export async function verifyPexelsKey(req, res) {
  try {
    const key = req.headers.authorization || req.body?.key || process.env.PEXELS_API_KEY;

    if (!key) {
      return res.status(400).json({ success: false, message: 'No API key provided' });
    }

    const response = await fetch('https://api.pexels.com/v1/curated?per_page=1', {
      headers: { Authorization: key.trim() },
    });

    if (response.ok) {
      return res.json({ success: true, message: 'Pexels API Key connected successfully!' });
    } else if (response.status === 401) {
      return res.status(401).json({ success: false, message: 'Invalid Pexels API token' });
    } else {
      return res.status(response.status).json({ success: false, message: `Pexels returned status ${response.status}` });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Verification failed' });
  }
}

/**
 * Proxy download stream to bypass CORS on direct file downloads
 */
export async function proxyDownload(req, res) {
  try {
    const { url, filename } = req.query;

    if (!url) {
      return res.status(400).json({ error: 'Image URL is required' });
    }

    const imageRes = await fetch(url);
    if (!imageRes.ok) {
      return res.status(imageRes.status).json({ error: 'Failed to fetch image from source' });
    }

    const contentType = imageRes.headers.get('content-type') || 'image/jpeg';
    const cleanFilename = (filename || 'wallpaper.jpg').replace(/[^a-zA-Z0-9_.-]/g, '_');

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${cleanFilename}"`);

    const arrayBuffer = await imageRes.arrayBuffer();
    return res.send(Buffer.from(arrayBuffer));
  } catch (error) {
    console.error('Proxy download error:', error);
    return res.status(500).json({ error: 'Failed to stream image' });
  }
}
