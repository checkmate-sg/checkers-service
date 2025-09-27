

function setupClientAPIs<T extends new (...args: any[]) => any>(Client: T, baseURL = '/api') {
    const api = new Client({ baseURL });
  
    return api as InstanceType<T>;

  }

export { setupClientAPIs };