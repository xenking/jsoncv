export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    
    console.log('Request:', pathname);
    
    // Serve the resume at root path
    if (pathname === '/' || pathname === '') {
      const resumeName = env.RESUME_NAME || 'Richard Hendriks CV';
      const resumePath = `/resume/${resumeName}.html`;
      console.log('Redirecting / to', resumePath);
      
      // Create new request with modified path
      const newUrl = new URL(request.url);
      newUrl.pathname = resumePath;
      const newRequest = new Request(newUrl.toString(), {
        method: request.method,
        headers: request.headers,
      });
      
      return env.ASSETS.fetch(newRequest);
    }
    
    // Serve editor at /editor or /editor/
    if (pathname === '/editor' || pathname === '/editor/') {
      console.log('Redirecting to editor at /index.html');
      const newUrl = new URL(request.url);
      newUrl.pathname = '/index.html';
      const newRequest = new Request(newUrl.toString(), {
        method: request.method,
        headers: request.headers,
      });
      return env.ASSETS.fetch(newRequest);
    }
    
    // Serve all other static assets normally
    console.log('Serving asset:', pathname);
    return env.ASSETS.fetch(request);
  }
}
