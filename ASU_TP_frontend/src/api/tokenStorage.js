let inMemoryToken = null;

export const getToken = () => inMemoryToken;

export const setToken = (token) => {
    inMemoryToken = token;
};

export const removeToken = () => {
    inMemoryToken = null;
};
