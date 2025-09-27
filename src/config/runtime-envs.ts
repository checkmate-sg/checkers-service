
function requireEnv(name: string) {
    const v = process.env[name];
    if (!v) throw new Error(`Missing required env: ${name}`);
    return v;
  }
  
  function stripTrailingSlash(u: string) {
    return u.replace(/\/+$/, '');
  }
  
  export const runtimeENVsServer = {
    get PROJECT_MAIN_API__PTE_URL() {
      const url = stripTrailingSlash(requireEnv('PROJECT_MAIN_API__PTE_URL'));
      return url; // e.g., https://api.example.com
    },
  };