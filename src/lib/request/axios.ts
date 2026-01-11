import libAxios from "axios";

libAxios.defaults.paramsSerializer = params => {
  const str: string[] = [];

  Object.keys(params).forEach(key => {
    const item: string | string[] = params[key];
    if (Array.isArray(item)) {
      if (item.length > 0) str.push(`${item.map(val => `${key}=${val}`).join("&")}`);
    } else {
      str.push(`${key}=${item}`);
    }
  });

  return str.join("&");
};

const axios = libAxios;
export { axios };
export default axios;
